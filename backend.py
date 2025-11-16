"""
AWS Spot Optimizer - Central Server Backend (UPDATED v2.1.0)
==============================================================
Added notification system, enhanced search, and fixed model status reporting

CHANGES:
- Added notification endpoints (GET, mark-read, mark-all-read)
- Added global search endpoint across clients, instances, and agents
- Added client statistics with charts data endpoint
- Fixed model loading status to differentiate decision engine vs ML models
- Added helper function to create notifications
- Integrated notifications into key events (switches, agent offline)
"""

import os
import json
from dotenv import load_dotenv
load_dotenv()

import logging
from datetime import datetime, timedelta
from pathlib import Path

from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error, pooling
from functools import wraps
from apscheduler.schedulers.background import BackgroundScheduler
from marshmallow import Schema, fields, validate, ValidationError

# Import decision engine (pluggable)
from decision_engine import DecisionEngine, DecisionEngineConfig

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==============================================================================
# CONFIGURATION
# ==============================================================================

class Config:
    """Server configuration"""
    
    # Database
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', 3306))
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'password')
    DB_NAME = os.getenv('DB_NAME', 'spot_optimizer')
    DB_POOL_SIZE = int(os.getenv('DB_POOL_SIZE', 10))
    
    # Decision Engine
    DECISION_ENGINE_TYPE = os.getenv('DECISION_ENGINE_TYPE', 'ml_based')
    MODEL_DIR = Path(os.getenv('MODEL_DIR', '/home/ubuntu/production_models'))
    REGION = 'ap-south-1'
    
    # Server
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5000))
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

config = Config()

# ==============================================================================
# MODEL STATUS TRACKING (FIXED)
# ==============================================================================

model_status = {
    'decision_engine_loaded': False,  # Lightweight decision logic
    'ml_models_loaded': False         # Heavy ML models (if applicable)
}

# ==============================================================================
# INPUT VALIDATION SCHEMAS
# ==============================================================================

class AgentRegistrationSchema(Schema):
    """Validation schema for agent registration"""
    client_token = fields.Str(required=True)
    hostname = fields.Str(required=True, validate=validate.Length(max=255))
    instance_id = fields.Str(required=True, validate=validate.Regexp(r'^i-[a-f0-9]+$'))
    instance_type = fields.Str(required=True, validate=validate.Length(max=64))
    region = fields.Str(required=True, validate=validate.Regexp(r'^[a-z]+-[a-z]+-\d+$'))
    az = fields.Str(required=True, validate=validate.Regexp(r'^[a-z]+-[a-z]+-\d+[a-z]$'))
    ami_id = fields.Str(required=True, validate=validate.Regexp(r'^ami-[a-f0-9]+$'))
    agent_version = fields.Str(required=True, validate=validate.Length(max=32))

class ForceSwitchSchema(Schema):
    """Validation schema for force switch"""
    target = fields.Str(required=True, validate=validate.OneOf(['ondemand', 'pool']))
    pool_id = fields.Str(required=False, validate=validate.Length(max=128))

class AgentSettingsSchema(Schema):
    """Validation schema for agent settings"""
    auto_switch_enabled = fields.Bool(required=False)
    auto_terminate_enabled = fields.Bool(required=False)

# ==============================================================================
# FLASK APP
# ==============================================================================

app = Flask(__name__)
CORS(app)

# ==============================================================================
# DATABASE CONNECTION POOLING
# ==============================================================================

connection_pool = None

def init_db_pool():
    """Initialize database connection pool"""
    global connection_pool
    try:
        connection_pool = pooling.MySQLConnectionPool(
            pool_name="spot_optimizer_pool",
            pool_size=config.DB_POOL_SIZE,
            pool_reset_session=True,
            host=config.DB_HOST,
            port=config.DB_PORT,
            user=config.DB_USER,
            password=config.DB_PASSWORD,
            database=config.DB_NAME,
            autocommit=False
        )
        logger.info(f"✓ Database connection pool initialized (size: {config.DB_POOL_SIZE})")
    except Error as e:
        logger.error(f"Failed to initialize connection pool: {e}")
        raise

def get_db_connection():
    """Get connection from pool"""
    try:
        return connection_pool.get_connection()
    except Error as e:
        logger.error(f"Failed to get connection from pool: {e}")
        raise

def execute_query(query, params=None, fetch=False, fetch_one=False, commit=True):
    """Execute database query with error handling"""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(query, params or ())
        
        if fetch_one:
            result = cursor.fetchone()
        elif fetch:
            result = cursor.fetchall()
        else:
            result = None
            
        if commit and not fetch and not fetch_one:
            connection.commit()
            
        return result
    except Error as e:
        if connection:
            connection.rollback()
        logger.error(f"Query execution error: {e}")
        logger.error(f"Query: {query}")
        logger.error(f"Params: {params}")
        
        log_system_event('database_error', 'error', str(e), metadata={'query': query[:200]})
        raise
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

# ==============================================================================
# SYSTEM EVENTS LOGGING
# ==============================================================================

def log_system_event(event_type, severity, message, client_id=None, agent_id=None, 
                     instance_id=None, metadata=None):
    """Log system event"""
    try:
        execute_query("""
            INSERT INTO system_events (event_type, severity, client_id, agent_id, 
                                      instance_id, message, metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (event_type, severity, client_id, agent_id, instance_id, 
              message, json.dumps(metadata) if metadata else None))
    except Exception as e:
        logger.error(f"Failed to log system event: {e}")

# ==============================================================================
# NOTIFICATION HELPER FUNCTION
# ==============================================================================

def create_notification(message, severity='info', client_id=None):
    """Create a notification"""
    try:
        execute_query("""
            INSERT INTO notifications (message, severity, client_id, created_at)
            VALUES (%s, %s, %s, NOW())
        """, (message, severity, client_id))
        logger.info(f"Notification created: {message[:50]}... (severity: {severity})")
    except Exception as e:
        logger.error(f"Failed to create notification: {e}")

# ==============================================================================
# DECISION ENGINE INITIALIZATION (FIXED STATUS TRACKING)
# ==============================================================================

decision_engine = None

def init_decision_engine():
    """Initialize decision engine"""
    global decision_engine, model_status
    try:
        engine_config = DecisionEngineConfig(
            model_dir=config.MODEL_DIR,
            region=config.REGION,
            engine_type=config.DECISION_ENGINE_TYPE
        )
        
        decision_engine = DecisionEngine(engine_config)
        decision_engine.load()
        
        # Update status tracking
        model_status['decision_engine_loaded'] = True
        
        # Check if ML models are actually loaded
        if hasattr(decision_engine, 'has_ml_models'):
            model_status['ml_models_loaded'] = decision_engine.has_ml_models()
        else:
            # For rule-based engines, no ML models
            model_status['ml_models_loaded'] = (config.DECISION_ENGINE_TYPE == 'ml_based')
        
        logger.info(f"✓ Decision engine initialized: {config.DECISION_ENGINE_TYPE}")
        logger.info(f"  - Decision Engine: {'Loaded' if model_status['decision_engine_loaded'] else 'Not Loaded'}")
        logger.info(f"  - ML Models: {'Loaded' if model_status['ml_models_loaded'] else 'Not Loaded'}")
        
        log_system_event('decision_engine_loaded', 'info', 
                        f'Decision engine {config.DECISION_ENGINE_TYPE} loaded successfully')
        
    except Exception as e:
        logger.error(f"Failed to initialize decision engine: {e}")
        model_status['decision_engine_loaded'] = False
        model_status['ml_models_loaded'] = False
        log_system_event('decision_engine_load_failed', 'error', str(e))
        raise

# ==============================================================================
# AUTHENTICATION MIDDLEWARE
# ==============================================================================

def require_client_token(f):
    """Validate client token"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            token = request.json.get('client_token') if request.json else None
        
        if not token:
            return jsonify({'error': 'Missing client token'}), 401
        
        client = execute_query(
            "SELECT id, name FROM clients WHERE client_token = %s AND status = 'active'",
            (token,),
            fetch_one=True
        )
        
        if not client:
            log_system_event('auth_failed', 'warning', 'Invalid client token attempt')
            return jsonify({'error': 'Invalid client token'}), 401
        
        request.client_id = client['id']
        request.client_name = client['name']
        return f(*args, **kwargs)
    
    return decorated_function

# ==============================================================================
# SCHEDULED JOBS
# ==============================================================================

def compute_monthly_savings_job():
    """Compute monthly savings for all clients"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("SELECT id FROM clients WHERE status = 'active'")
        clients = cursor.fetchall()
        
        now = datetime.utcnow()
        year = now.year
        month = now.month
        
        for client in clients:
            try:
                cursor.callproc('calculate_monthly_savings', [client['id'], year, month])
                connection.commit()
            except Exception as e:
                logger.error(f"Failed to compute savings for client {client['id']}: {e}")
        
        cursor.close()
        connection.close()
        
        logger.info(f"✓ Monthly savings computed for {len(clients)} clients")
        log_system_event('savings_computed', 'info', 
                        f"Computed monthly savings for {len(clients)} clients")
        
    except Exception as e:
        logger.error(f"Savings computation job failed: {e}")
        log_system_event('savings_computation_failed', 'error', str(e))

def cleanup_old_data_job():
    """Clean up old time-series data"""
    try:
        execute_query("""
            DELETE FROM spot_price_snapshots 
            WHERE captured_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
        """)
        
        execute_query("""
            DELETE FROM ondemand_price_snapshots 
            WHERE captured_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
        """)
        
        execute_query("""
            DELETE FROM risk_scores 
            WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
        """)
        
        logger.info("✓ Old data cleaned up")
        log_system_event('data_cleanup', 'info', 'Cleaned up old time-series data')
        
    except Exception as e:
        logger.error(f"Data cleanup job failed: {e}")
        log_system_event('cleanup_failed', 'error', str(e))

# ==============================================================================
# NEW NOTIFICATION ENDPOINTS
# ==============================================================================

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    """Get recent notifications"""
    client_id = request.args.get('client_id')
    limit = int(request.args.get('limit', 10))
    
    try:
        query = """
            SELECT id, message, severity, is_read, created_at
            FROM notifications
        """
        params = []
        
        if client_id:
            query += " WHERE client_id = %s OR client_id IS NULL"
            params.append(client_id)
        
        query += " ORDER BY created_at DESC LIMIT %s"
        params.append(limit)
        
        notifications = execute_query(query, tuple(params), fetch=True)
        
        return jsonify([{
            'id': n['id'],
            'message': n['message'],
            'severity': n['severity'],
            'isRead': n['is_read'],
            'time': n['created_at'].isoformat()
        } for n in notifications])
    except Exception as e:
        logger.error(f"Get notifications error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/<int:notif_id>/mark-read', methods=['POST'])
def mark_notification_read(notif_id):
    """Mark notification as read"""
    try:
        execute_query("""
            UPDATE notifications
            SET is_read = TRUE
            WHERE id = %s
        """, (notif_id,))
        
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Mark notification read error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/mark-all-read', methods=['POST'])
def mark_all_notifications_read():
    """Mark all notifications as read"""
    client_id = request.json.get('client_id') if request.json else None
    
    try:
        if client_id:
            execute_query("""
                UPDATE notifications
                SET is_read = TRUE
                WHERE client_id = %s OR client_id IS NULL
            """, (client_id,))
        else:
            execute_query("UPDATE notifications SET is_read = TRUE")
        
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Mark all read error: {e}")
        return jsonify({'error': str(e)}), 500

# ==============================================================================
# ENHANCED SEARCH ENDPOINT
# ==============================================================================

@app.route('/api/search', methods=['GET'])
def global_search():
    """Global search across clients, instances, and agents"""
    query = request.args.get('q', '').strip()
    
    if not query or len(query) < 2:
        return jsonify({'results': []})
    
    try:
        results = {
            'clients': [],
            'instances': [],
            'agents': []
        }
        
        # Search clients
        clients = execute_query("""
            SELECT id, name, status, total_savings
            FROM clients
            WHERE name LIKE %s OR id LIKE %s
            LIMIT 5
        """, (f'%{query}%', f'%{query}%'), fetch=True)
        
        results['clients'] = [{
            'id': c['id'],
            'name': c['name'],
            'type': 'client',
            'status': c['status']
        } for c in clients]
        
        # Search instances
        instances = execute_query("""
            SELECT i.id, i.instance_type, i.current_mode, c.name as client_name
            FROM instances i
            JOIN clients c ON c.id = i.client_id
            WHERE i.id LIKE %s OR i.instance_type LIKE %s
            LIMIT 5
        """, (f'%{query}%', f'%{query}%'), fetch=True)
        
        results['instances'] = [{
            'id': i['id'],
            'name': f"{i['id']} ({i['instance_type']})",
            'type': 'instance',
            'client': i['client_name']
        } for i in instances]
        
        # Search agents
        agents = execute_query("""
            SELECT a.id, a.status, c.name as client_name
            FROM agents a
            JOIN clients c ON c.id = a.client_id
            WHERE a.id LIKE %s OR a.hostname LIKE %s
            LIMIT 5
        """, (f'%{query}%', f'%{query}%'), fetch=True)
        
        results['agents'] = [{
            'id': a['id'],
            'name': a['id'],
            'type': 'agent',
            'status': a['status'],
            'client': a['client_name']
        } for a in agents]
        
        return jsonify(results)
    except Exception as e:
        logger.error(f"Search error: {e}")
        return jsonify({'error': str(e)}), 500

# ==============================================================================
# CLIENT STATISTICS WITH CHARTS DATA
# ==============================================================================

@app.route('/api/client/<client_id>/stats/charts', methods=['GET'])
def get_client_chart_data(client_id):
    """Get comprehensive chart data for client dashboard"""
    try:
        # Monthly savings trend
        savings_trend = execute_query("""
            SELECT 
                MONTHNAME(CONCAT(year, '-', month, '-01')) as month,
                savings,
                baseline_cost,
                actual_cost
            FROM client_savings_monthly
            WHERE client_id = %s
            ORDER BY year DESC, month DESC
            LIMIT 12
        """, (client_id,), fetch=True)
        
        # Mode distribution
        mode_dist = execute_query("""
            SELECT 
                current_mode,
                COUNT(*) as count
            FROM instances
            WHERE client_id = %s AND is_active = TRUE
            GROUP BY current_mode
        """, (client_id,), fetch=True)
        
        # Switch frequency over time
        switch_freq = execute_query("""
            SELECT 
                DATE(timestamp) as date,
                COUNT(*) as switches
            FROM switch_events
            WHERE client_id = %s
              AND timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(timestamp)
            ORDER BY date ASC
        """, (client_id,), fetch=True)
        
        return jsonify({
            'savingsTrend': [{
                'month': s['month'],
                'savings': float(s['savings']),
                'baseline': float(s['baseline_cost']),
                'actual': float(s['actual_cost'])
            } for s in reversed(savings_trend)],
            'modeDistribution': [{
                'mode': m['current_mode'],
                'count': m['count']
            } for m in mode_dist],
            'switchFrequency': [{
                'date': s['date'].isoformat(),
                'switches': s['switches']
            } for s in switch_freq]
        })
    except Exception as e:
        logger.error(f"Get chart data error: {e}")
        return jsonify({'error': str(e)}), 500

# ==============================================================================
# AGENT-FACING API ENDPOINTS
# ==============================================================================

@app.route('/api/agents/register', methods=['POST'])
@require_client_token
def register_agent():
    """Register new agent with validation"""
    data = request.json
    
    schema = AgentRegistrationSchema()
    try:
        validated_data = schema.load(data)
    except ValidationError as e:
        log_system_event('validation_error', 'warning', 
                        f"Agent registration validation failed: {e.messages}")
        return jsonify({'error': 'Validation failed', 'details': e.messages}), 400
    
    try:
        agent_id = f"agent-{validated_data['instance_id'][:8]}"
        
        existing = execute_query(
            "SELECT id FROM agents WHERE id = %s",
            (agent_id,),
            fetch_one=True
        )
        
        if existing:
            execute_query("""
                UPDATE agents 
                SET client_id = %s, status = 'online', hostname = %s, 
                    agent_version = %s, last_heartbeat = NOW()
                WHERE id = %s
            """, (request.client_id, validated_data.get('hostname'), 
                  validated_data.get('agent_version'), agent_id))
        else:
            execute_query("""
                INSERT INTO agents (id, client_id, status, hostname, agent_version, last_heartbeat)
                VALUES (%s, %s, 'online', %s, %s, NOW())
            """, (agent_id, request.client_id, validated_data.get('hostname'), 
                  validated_data.get('agent_version')))
            
            # Create notification for new agent
            create_notification(
                f"New agent registered: {agent_id}",
                'info',
                request.client_id
            )
        
        config_exists = execute_query(
            "SELECT agent_id FROM agent_configs WHERE agent_id = %s",
            (agent_id,),
            fetch_one=True
        )
        
        if not config_exists:
            execute_query("""
                INSERT INTO agent_configs (agent_id)
                VALUES (%s)
            """, (agent_id,))
        
        config_data = execute_query("""
            SELECT ac.*, a.enabled, a.auto_switch_enabled, a.auto_terminate_enabled
            FROM agent_configs ac
            JOIN agents a ON a.id = ac.agent_id
            WHERE ac.agent_id = %s
        """, (agent_id,), fetch_one=True)
        
        instance_exists = execute_query(
            "SELECT id, baseline_ondemand_price FROM instances WHERE id = %s",
            (validated_data['instance_id'],),
            fetch_one=True
        )
        
        if not instance_exists:
            latest_od_price = execute_query("""
                SELECT price FROM ondemand_price_snapshots
                WHERE region = %s AND instance_type = %s
                ORDER BY captured_at DESC
                LIMIT 1
            """, (validated_data['region'], validated_data['instance_type']), fetch_one=True)
            
            baseline_price = latest_od_price['price'] if latest_od_price else 0.1
            
            execute_query("""
                INSERT INTO instances (
                    id, client_id, agent_id, instance_type, region, az, ami_id, 
                    installed_at, is_active, baseline_ondemand_price
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), TRUE, %s)
            """, (
                validated_data['instance_id'], request.client_id, agent_id,
                validated_data['instance_type'], validated_data['region'], 
                validated_data['az'], validated_data['ami_id'], baseline_price
            ))
        elif not instance_exists['baseline_ondemand_price']:
            latest_od_price = execute_query("""
                SELECT price FROM ondemand_price_snapshots
                WHERE region = %s AND instance_type = %s
                ORDER BY captured_at DESC
                LIMIT 1
            """, (validated_data['region'], validated_data['instance_type']), fetch_one=True)
            
            if latest_od_price:
                execute_query("""
                    UPDATE instances 
                    SET baseline_ondemand_price = %s
                    WHERE id = %s AND baseline_ondemand_price IS NULL
                """, (latest_od_price['price'], validated_data['instance_id']))
        
        log_system_event('agent_registered', 'info', 
                        f"Agent {agent_id} registered", 
                        request.client_id, agent_id, validated_data['instance_id'])
        
        return jsonify({
            'agent_id': agent_id,
            'client_id': request.client_id,
            'config': {
                'enabled': config_data['enabled'],
                'auto_switch_enabled': config_data['auto_switch_enabled'],
                'auto_terminate_enabled': config_data['auto_terminate_enabled'],
                'min_savings_percent': float(config_data['min_savings_percent']),
                'risk_threshold': float(config_data['risk_threshold']),
                'max_switches_per_week': config_data['max_switches_per_week'],
                'min_pool_duration_hours': config_data['min_pool_duration_hours']
            }
        })
        
    except Exception as e:
        logger.error(f"Agent registration error: {e}")
        log_system_event('agent_registration_failed', 'error', str(e), 
                        request.client_id, metadata={'instance_id': validated_data.get('instance_id')})
        return jsonify({'error': str(e)}), 500

@app.route('/api/agents/<agent_id>/heartbeat', methods=['POST'])
@require_client_token
def agent_heartbeat(agent_id):
    """Update agent heartbeat"""
    data = request.json
    
    try:
        # Get previous status
        prev_status = execute_query("""
            SELECT status FROM agents WHERE id = %s
        """, (agent_id,), fetch_one=True)
        
        new_status = data.get('status', 'online')
        
        execute_query("""
            UPDATE agents 
            SET status = %s, last_heartbeat = NOW(), instance_count = %s
            WHERE id = %s AND client_id = %s
        """, (
            new_status,
            len(data.get('monitored_instances', [])),
            agent_id,
            request.client_id
        ))
        
        # Notify if agent went offline
        if prev_status and prev_status['status'] == 'online' and new_status == 'offline':
            create_notification(
                f"Agent {agent_id} went offline",
                'warning',
                request.client_id
            )
        
        execute_query(
            "UPDATE clients SET last_sync_at = NOW() WHERE id = %s",
            (request.client_id,)
        )
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f"Heartbeat error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/agents/<agent_id>/pricing-report', methods=['POST'])
@require_client_token
def pricing_report(agent_id):
    """Receive pricing data from agent"""
    data = request.json
    
    try:
        instance = data['instance']
        on_demand = data['on_demand_price']
        spot_pools = data['spot_pools']
        
        execute_query("""
            UPDATE instances
            SET ondemand_price = %s, updated_at = NOW()
            WHERE id = %s AND client_id = %s
        """, (on_demand['price'], instance['instance_id'], request.client_id))
        
        for pool in spot_pools:
            pool_id = pool['pool_id']
            
            execute_query("""
                INSERT INTO spot_pools (id, instance_type, region, az)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE id = id
            """, (pool_id, instance['instance_type'], instance['region'], pool['az']))
            
            execute_query("""
                INSERT INTO spot_price_snapshots (pool_id, price, captured_at)
                VALUES (%s, %s, NOW())
            """, (pool_id, pool['price']))
        
        execute_query("""
            INSERT INTO ondemand_price_snapshots (region, instance_type, price, captured_at)
            VALUES (%s, %s, %s, NOW())
        """, (instance['region'], instance['instance_type'], on_demand['price']))
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f"Pricing report error: {e}")
        log_system_event('pricing_report_failed', 'error', str(e), 
                        request.client_id, agent_id, instance.get('instance_id'))
        return jsonify({'error': str(e)}), 500

@app.route('/api/agents/<agent_id>/config', methods=['GET'])
@require_client_token
def get_agent_config(agent_id):
    """Get agent configuration"""
    try:
        config_data = execute_query("""
            SELECT ac.*, a.enabled, a.auto_switch_enabled, a.auto_terminate_enabled
            FROM agent_configs ac
            JOIN agents a ON a.id = ac.agent_id
            WHERE ac.agent_id = %s AND a.client_id = %s
        """, (agent_id, request.client_id), fetch_one=True)
        
        if not config_data or not config_data['enabled']:
            return jsonify({
                'instance_id': instance['instance_id'],
                'risk_score': 0.0,
                'recommended_action': 'stay',
                'recommended_mode': instance['current_mode'],
                'recommended_pool_id': instance.get('current_pool_id'),
                'expected_savings_per_hour': 0.0,
                'allowed': False,
                'reason': 'Agent disabled'
            })
        
        # Get switch history for policy enforcement
        recent_switches = execute_query("""
            SELECT COUNT(*) as count
            FROM switch_events
            WHERE agent_id = %s AND timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        """, (agent_id,), fetch_one=True)
        
        last_switch = execute_query("""
            SELECT timestamp FROM switch_events
            WHERE instance_id = %s OR new_instance_id = %s
            ORDER BY timestamp DESC
            LIMIT 1
        """, (instance['instance_id'], instance['instance_id']), fetch_one=True)
        
        # CALL DECISION ENGINE (DECOUPLED)
        decision = decision_engine.make_decision(
            instance=instance,
            pricing=pricing,
            config=config_data,
            recent_switches_count=recent_switches['count'],
            last_switch_time=last_switch['timestamp'] if last_switch else None
        )
        
        # Store decision in database
        execute_query("""
            INSERT INTO risk_scores (
                client_id, instance_id, agent_id, risk_score, recommended_action,
                recommended_pool_id, recommended_mode, expected_savings_per_hour,
                allowed, reason
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            request.client_id, instance['instance_id'], agent_id,
            decision['risk_score'], decision['recommended_action'], 
            decision['recommended_pool_id'], decision['recommended_mode'], 
            decision['expected_savings_per_hour'], decision['allowed'], 
            decision['reason']
        ))
        
        return jsonify(decision)
        
    except Exception as e:
        logger.error(f"Decision error: {e}")
        log_system_event('decision_error', 'error', str(e), 
                        request.client_id, agent_id, instance.get('instance_id'))
        return jsonify({'error': str(e)}), 500
            return jsonify({
                'instance_id': instance['instance_id'],
                'risk_score': 0.0,
                'recommended_action': 'stay',
                'recommended_mode': instance['current_mode'],
                'recommended_pool_id': instance.get('current_pool_id'),
                'expected_savings_per_hour': 0.0,
                'allowed': False,
                'reason': 'Agent disabled'
            })
        
        # Get switch history for policy enforcement
        recent_switches = execute_query("""
            SELECT COUNT(*) as count
            FROM switch_events
            WHERE agent_id = %s AND timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        """, (agent_id,), fetch_one=True)
        
        last_switch = execute_query("""
            SELECT timestamp FROM switch_events
            WHERE instance_id = %s OR new_instance_id = %s
            ORDER BY timestamp DESC
            LIMIT 1
        """, (instance['instance_id'], instance['instance_id']), fetch_one=True)
        
        # CALL DECISION ENGINE (DECOUPLED)
        decision = decision_engine.make_decision(
            instance=instance,
            pricing=pricing,
            config=config_data,
            recent_switches_count=recent_switches['count'],
            last_switch_time=last_switch['timestamp'] if last_switch else None
        )
        
        # Store decision in database
        execute_query("""
            INSERT INTO risk_scores (
                client_id, instance_id, agent_id, risk_score, recommended_action,
                recommended_pool_id, recommended_mode, expected_savings_per_hour,
                allowed, reason
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            request.client_id, instance['instance_id'], agent_id,
            decision['risk_score'], decision['recommended_action'], 
            decision['recommended_pool_id'], decision['recommended_mode'], 
            decision['expected_savings_per_hour'], decision['allowed'], 
            decision['reason']
        ))
        
        return jsonify(decision)
        
    except Exception as e:
        logger.error(f"Decision error: {e}")
        log_system_event('decision_error', 'error', str(e), 
                        request.client_id, agent_id, instance.get('instance_id'))
        return jsonify({'error': str(e)}), 500

@app.route('/api/agents/<agent_id>/switch-report', methods=['POST'])
@require_client_token
def switch_report(agent_id):
    """Record switch event"""
    data = request.json
    
    try:
        old_inst = data['old_instance']
        new_inst = data['new_instance']
        snapshot = data['snapshot']
        prices = data['prices']
        timing = data['timing']
        
        savings_impact = prices['old_spot'] - prices.get('new_spot', prices['on_demand'])
        
        execute_query("""
            INSERT INTO switch_events (
                client_id, instance_id, agent_id, event_trigger,
                from_mode, to_mode, from_pool_id, to_pool_id,
                on_demand_price, old_spot_price, new_spot_price,
                savings_impact, snapshot_used, snapshot_id,
                old_instance_id, new_instance_id, timestamp
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            request.client_id, new_inst['instance_id'], agent_id,
            data['trigger'],
            old_inst['mode'], new_inst['mode'],
            old_inst.get('pool_id'), new_inst.get('pool_id'),
            prices['on_demand'], prices['old_spot'], prices.get('new_spot', 0),
            savings_impact, snapshot['used'], snapshot.get('snapshot_id'),
            old_inst['instance_id'], new_inst['instance_id'],
            timing['traffic_switched_at']
        ))
        
        execute_query("""
            UPDATE instances
            SET is_active = FALSE, terminated_at = %s
            WHERE id = %s AND client_id = %s
        """, (timing.get('old_instance_terminated_at'), old_inst['instance_id'], request.client_id))
        
        execute_query("""
            INSERT INTO instances (
                id, client_id, agent_id, instance_type, region, az, ami_id,
                current_mode, current_pool_id, spot_price, is_active,
                installed_at, last_switch_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, %s, %s)
            ON DUPLICATE KEY UPDATE
                current_mode = VALUES(current_mode),
                current_pool_id = VALUES(current_pool_id),
                spot_price = VALUES(spot_price),
                is_active = TRUE,
                last_switch_at = VALUES(last_switch_at)
        """, (
            new_inst['instance_id'], request.client_id, agent_id,
            new_inst['instance_type'], new_inst['region'], new_inst['az'],
            new_inst['ami_id'], new_inst['mode'], new_inst.get('pool_id'),
            prices.get('new_spot', 0), timing['new_instance_ready_at'],
            timing['traffic_switched_at']
        ))
        
        if savings_impact > 0:
            hourly_savings = savings_impact * 24
            execute_query("""
                UPDATE clients
                SET total_savings = total_savings + %s
                WHERE id = %s
            """, (hourly_savings, request.client_id))
        
        # Create notification for switch
        create_notification(
            f"Instance switched: {new_inst['instance_id']} - Saved ${savings_impact:.4f}/hr",
            'info',
            request.client_id
        )
        
        log_system_event('switch_completed', 'info', 
                        f"Switch from {old_inst['instance_id']} to {new_inst['instance_id']}",
                        request.client_id, agent_id, new_inst['instance_id'],
                        metadata={'savings_impact': float(savings_impact)})
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f"Switch report error: {e}")
        log_system_event('switch_report_failed', 'error', str(e),
                        request.client_id, agent_id)
        return jsonify({'error': str(e)}), 500

@app.route('/api/agents/<agent_id>/pending-commands', methods=['GET'])
@require_client_token
def get_pending_commands(agent_id):
    """Get pending switch commands for agent"""
    try:
        commands = execute_query("""
            SELECT * FROM pending_switch_commands
            WHERE agent_id = %s AND executed_at IS NULL
            ORDER BY created_at ASC
        """, (agent_id,), fetch=True)
        
        return jsonify([{
            'id': cmd['id'],
            'instance_id': cmd['instance_id'],
            'target_mode': cmd['target_mode'],
            'target_pool_id': cmd['target_pool_id'],
            'created_at': cmd['created_at'].isoformat()
        } for cmd in commands])
        
    except Exception as e:
        logger.error(f"Get pending commands error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/agents/<agent_id>/mark-command-executed', methods=['POST'])
@require_client_token
def mark_command_executed(agent_id):
    """Mark pending command as executed"""
    data = request.json
    
    try:
        execute_query("""
            UPDATE pending_switch_commands
            SET executed_at = NOW()
            WHERE id = %s AND agent_id = %s
        """, (data['command_id'], agent_id))
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f"Mark command executed error: {e}")
        return jsonify({'error': str(e)}), 500

# ==============================================================================
# CLIENT DASHBOARD API ENDPOINTS
# ==============================================================================

@app.route('/api/client/<client_id>', methods=['GET'])
def get_client_details(client_id):
    """Get client overview"""
    try:
        client = execute_query("""
            SELECT 
                c.*,
                COUNT(DISTINCT CASE WHEN a.status = 'online' THEN a.id END) as agents_online,
                COUNT(DISTINCT a.id) as agents_total,
                COUNT(DISTINCT CASE WHEN i.is_active = TRUE THEN i.id END) as instances
            FROM clients c
            LEFT JOIN agents a ON a.client_id = c.id
            LEFT JOIN instances i ON i.client_id = c.id
            WHERE c.id = %s
            GROUP BY c.id
        """, (client_id,), fetch_one=True)
        
        if not client:
            return jsonify({'error': 'Client not found'}), 404
        
        return jsonify({
            'id': client['id'],
            'name': client['name'],
            'status': client['status'],
            'agentsOnline': client['agents_online'] or 0,
            'agentsTotal': client['agents_total'] or 0,
            'instances': client['instances'] or 0,
            'totalSavings': float(client['total_savings'] or 0),
            'lastSync': client['last_sync_at'].isoformat() if client['last_sync_at'] else None
        })
        
    except Exception as e:
        logger.error(f"Get client details error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/client/<client_id>/agents', methods=['GET'])
def get_client_agents(client_id):
    """Get all agents for client"""
    try:
        agents = execute_query("""
            SELECT a.*, ac.min_savings_percent, ac.risk_threshold,
                   ac.max_switches_per_week, ac.min_pool_duration_hours
            FROM agents a
            LEFT JOIN agent_configs ac ON ac.agent_id = a.id
            WHERE a.client_id = %s
            ORDER BY a.last_heartbeat DESC
        """, (client_id,), fetch=True)
        
        return jsonify([{
            'id': agent['id'],
            'status': agent['status'],
            'lastHeartbeat': agent['last_heartbeat'].isoformat() if agent['last_heartbeat'] else None,
            'instanceCount': agent['instance_count'] or 0,
            'enabled': agent['enabled'],
            'auto_switch_enabled': agent['auto_switch_enabled'],
            'auto_terminate_enabled': agent['auto_terminate_enabled']
        } for agent in agents])
        
    except Exception as e:
        logger.error(f"Get agents error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/client/agents/<agent_id>/toggle-enabled', methods=['POST'])
def toggle_agent(agent_id):
    """Enable/disable agent"""
    data = request.json
    
    try:
        execute_query("""
            UPDATE agents
            SET enabled = %s
            WHERE id = %s
        """, (data['enabled'], agent_id))
        
        log_system_event('agent_toggled', 'info', 
                        f"Agent {agent_id} {'enabled' if data['enabled'] else 'disabled'}",
                        agent_id=agent_id)
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f"Toggle agent error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/client/agents/<agent_id>/settings', methods=['POST'])
def update_agent_settings(agent_id):
    """Update agent auto-switch and auto-terminate settings"""
    data = request.json
    
    schema = AgentSettingsSchema()
    try:
        validated_data = schema.load(data)
    except ValidationError as e:
        return jsonify({'error': 'Validation failed', 'details': e.messages}), 400
    
    try:
        updates = []
        params = []
        
        if 'auto_switch_enabled' in validated_data:
            updates.append("auto_switch_enabled = %s")
            params.append(validated_data['auto_switch_enabled'])
        
        if 'auto_terminate_enabled' in validated_data:
            updates.append("auto_terminate_enabled = %s")
            params.append(validated_data['auto_terminate_enabled'])
        
        if updates:
            params.append(agent_id)
            execute_query(f"""
                UPDATE agents
                SET {', '.join(updates)}
                WHERE id = %s
            """, tuple(params))
            
            log_system_event('agent_settings_updated', 'info',
                            f"Agent {agent_id} settings updated",
                            agent_id=agent_id, metadata=validated_data)
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f"Update agent settings error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/client/<client_id>/instances', methods=['GET'])
def get_client_instances(client_id):
    """Get all instances for client with optional filtering"""
    status = request.args.get('status', 'all')
    mode = request.args.get('mode', 'all')
    search = request.args.get('search', '')
    
    try:
        query = "SELECT * FROM instances WHERE client_id = %s"
        params = [client_id]
        
        if status == 'active':
            query += " AND is_active = TRUE"
        elif status == 'terminated':
            query += " AND is_active = FALSE"
        
        if mode != 'all':
            query += " AND current_mode = %s"
            params.append(mode)
        
        if search:
            query += " AND (id LIKE %s OR instance_type LIKE %s)"
            params.extend([f'%{search}%', f'%{search}%'])
        
        query += " ORDER BY created_at DESC"
        
        instances = execute_query(query, tuple(params), fetch=True)
        
        return jsonify([{
            'id': inst['id'],
            'type': inst['instance_type'],
            'az': inst['az'],
            'mode': inst['current_mode'],
            'poolId': inst['current_pool_id'] or 'n/a',
            'spotPrice': float(inst['spot_price'] or 0),
            'onDemandPrice': float(inst['ondemand_price'] or 0),
            'lastSwitch': inst['last_switch_at'].isoformat() if inst['last_switch_at'] else None
        } for inst in instances])
        
    except Exception as e:
        logger.error(f"Get instances error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/client/instances/<instance_id>/pricing', methods=['GET'])
def get_instance_pricing(instance_id):
    """Get pricing details for instance"""
    try:
        instance = execute_query("""
            SELECT instance_type, region, ondemand_price
            FROM instances
            WHERE id = %s
        """, (instance_id,), fetch_one=True)
        
        if not instance:
            return jsonify({'error': 'Instance not found'}), 404
        
        pools = execute_query("""
            SELECT 
                sp.id as pool_id,
                sp.az,
                sps.price,
                sps.captured_at
            FROM spot_pools sp
            JOIN (
                SELECT pool_id, price, captured_at,
                       ROW_NUMBER() OVER (PARTITION BY pool_id ORDER BY captured_at DESC) as rn
                FROM spot_price_snapshots
            ) sps ON sps.pool_id = sp.id AND sps.rn = 1
            WHERE sp.instance_type = %s AND sp.region = %s
            ORDER BY sps.price ASC
        """, (instance['instance_type'], instance['region']), fetch=True)
        
        ondemand_price = float(instance['ondemand_price'] or 0)
        
        return jsonify({
            'onDemand': {
                'name': 'On-Demand',
                'price': ondemand_price
            },
            'pools': [{
                'id': pool['pool_id'],
                'price': float(pool['price']),
                'savings': ((ondemand_price - float(pool['price'])) / ondemand_price * 100) if ondemand_price > 0 else 0
            } for pool in pools]
        })
        
    except Exception as e:
        logger.error(f"Get instance pricing error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/client/instances/<instance_id>/force-switch', methods=['POST'])
def force_instance_switch(instance_id):
    """Manually force instance switch with pending commands"""
    data = request.json
    
    schema = ForceSwitchSchema()
    try:
        validated_data = schema.load(data)
    except ValidationError as e:
        return jsonify({'error': 'Validation failed', 'details': e.messages}), 400
    
    try:
        instance = execute_query("""
            SELECT agent_id, client_id FROM instances WHERE id = %s
        """, (instance_id,), fetch_one=True)
        
        if not instance or not instance['agent_id']:
            return jsonify({'error': 'Instance or agent not found'}), 404
        
        target_mode = validated_data['target']
        target_pool_id = validated_data.get('pool_id') if target_mode == 'pool' else None
        
        execute_query("""
            INSERT INTO pending_switch_commands 
            (agent_id, instance_id, target_mode, target_pool_id, created_at)
            VALUES (%s, %s, %s, %s, NOW())
        """, (instance['agent_id'], instance_id, target_mode, target_pool_id))
        
        # Create notification for manual switch
        create_notification(
            f"Manual switch queued for {instance_id}",
            'warning',
            instance['client_id']
        )
        
        log_system_event('manual_switch_requested', 'info',
                        f"Manual switch requested for {instance_id} to {target_mode}",
                        instance['client_id'], instance['agent_id'], instance_id,
                        metadata={'target': target_mode, 'pool_id': target_pool_id})
        
        return jsonify({
            'success': True,
            'message': 'Switch command queued. Agent will execute on next check.'
        })
        
    except Exception as e:
        logger.error(f"Force switch error: {e}")
        log_system_event('manual_switch_failed', 'error', str(e),
                        metadata={'instance_id': instance_id})
        return jsonify({'error': str(e)}), 500

# ==============================================================================
# AGENT CONFIGURATION & STATISTICS
# ==============================================================================

@app.route('/api/client/agents/<agent_id>/config', methods=['POST'])
def update_agent_config(agent_id):
    """Update agent configuration parameters"""
    data = request.json
    
    try:
        updates = []
        params = []
        
        if 'min_savings_percent' in data:
            updates.append("min_savings_percent = %s")
            params.append(data['min_savings_percent'])
        
        if 'risk_threshold' in data:
            updates.append("risk_threshold = %s")
            params.append(data['risk_threshold'])
        
        if 'max_switches_per_week' in data:
            updates.append("max_switches_per_week = %s")
            params.append(data['max_switches_per_week'])
        
        if 'min_pool_duration_hours' in data:
            updates.append("min_pool_duration_hours = %s")
            params.append(data['min_pool_duration_hours'])
        
        if updates:
            params.append(agent_id)
            execute_query(f"""
                UPDATE agent_configs
                SET {', '.join(updates)}
                WHERE agent_id = %s
            """, tuple(params))
            
            log_system_event('agent_config_updated', 'info',
                            f"Agent {agent_id} configuration updated",
                            agent_id=agent_id, metadata=data)
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f"Update agent config error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/client/agents/<agent_id>/statistics', methods=['GET'])
def get_agent_statistics(agent_id):
    """Get detailed agent statistics"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.callproc('get_agent_statistics', [agent_id])
        
        stats = None
        for result in cursor.stored_results():
            stats = result.fetchone()
        
        cursor.close()
        connection.close()
        
        if not stats:
            return jsonify({'error': 'Agent not found'}), 404
        
        return jsonify({
            'id': stats['id'],
            'status': stats['status'],
            'enabled': stats['enabled'],
            'autoSwitchEnabled': stats['auto_switch_enabled'],
            'autoTerminateEnabled': stats['auto_terminate_enabled'],
            'lastHeartbeat': stats['last_heartbeat'].isoformat() if stats['last_heartbeat'] else None,
            'instanceCount': stats['instance_count'] or 0,
            'managedInstances': stats['managed_instances'] or 0,
            'switchesLast7Days': stats['switches_last_7_days'] or 0,
            'switchesLast30Days': stats['switches_last_30_days'] or 0,
            'savingsLast30Days': float(stats['savings_last_30_days'] or 0)
        })
        
    except Exception as e:
        logger.error(f"Get agent statistics error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/client/instances/<instance_id>/price-history', methods=['GET'])
def get_price_history(instance_id):
    """Get price history for instance"""
    days = int(request.args.get('days', 7))
    interval = request.args.get('interval', 'hour')
    
    try:
        instance = execute_query("""
            SELECT instance_type, region, current_pool_id
            FROM instances WHERE id = %s
        """, (instance_id,), fetch_one=True)
        
        if not instance:
            return jsonify({'error': 'Instance not found'}), 404
        
        if not instance['current_pool_id']:
            return jsonify({'error': 'Instance has no pool assigned'}), 400
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.callproc('get_price_history', [instance['current_pool_id'], days, interval])
        
        history = []
        for result in cursor.stored_results():
            history = result.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify([{
            'time': h['time_bucket'],
            'avgPrice': float(h['avg_price']),
            'minPrice': float(h['min_price']),
            'maxPrice': float(h['max_price']),
            'sampleCount': h['sample_count']
        } for h in history])
        
    except Exception as e:
        logger.error(f"Get price history error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/client/instances/<instance_id>/metrics', methods=['GET'])
def get_instance_metrics(instance_id):
    """Get comprehensive instance metrics"""
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.callproc('get_instance_metrics', [instance_id])
        
        metrics = None
        for result in cursor.stored_results():
            metrics = result.fetchone()
        
        cursor.close()
        connection.close()
        
        if not metrics:
            return jsonify({'error': 'Instance not found'}), 404
        
        return jsonify({
            'id': metrics['id'],
            'instanceType': metrics['instance_type'],
            'currentMode': metrics['current_mode'],
            'currentPoolId': metrics['current_pool_id'],
            'spotPrice': float(metrics['spot_price'] or 0),
            'onDemandPrice': float(metrics['ondemand_price'] or 0),
            'baselineOnDemandPrice': float(metrics['baseline_ondemand_price'] or 0),
            'uptimeHours': metrics['uptime_hours'] or 0,
            'hoursSinceLastSwitch': metrics['hours_since_last_switch'] or 0,
            'totalSwitches': metrics['total_switches'] or 0,
            'switchesLast7Days': metrics['switches_last_7_days'] or 0,
            'switchesLast30Days': metrics['switches_last_30_days'] or 0,
            'savingsLast30Days': float(metrics['savings_last_30_days'] or 0),
            'totalSavings': float(metrics['total_savings'] or 0)
        })
        
    except Exception as e:
        logger.error(f"Get instance metrics error: {e}")
        return jsonify({'error': str(e)}), 500

# ==============================================================================
# EXPORT ENDPOINTS (CSV DOWNLOADS)
# ==============================================================================

@app.route('/api/client/<client_id>/export/savings', methods=['GET'])
def export_savings(client_id):
    """Export savings data as CSV"""
    import csv
    from io import StringIO
    from flask import Response
    
    try:
        savings = execute_query("""
            SELECT 
                year, 
                month,
                MONTHNAME(CONCAT(year, '-', LPAD(month, 2, '0'), '-01')) as month_name,
                baseline_cost, 
                actual_cost, 
                savings,
                ROUND((savings / baseline_cost * 100), 2) as savings_percent
            FROM client_savings_monthly
            WHERE client_id = %s
            ORDER BY year DESC, month DESC
        """, (client_id,), fetch=True)
        
        output = StringIO()
        writer = csv.writer(output)
        
        writer.writerow(['Year', 'Month', 'Baseline Cost ($)', 'Actual Cost ($)', 'Savings ($)', 'Savings (%)'])
        
        for row in savings:
            writer.writerow([
                row['year'],
                row['month_name'],
                f"{row['baseline_cost']:.2f}",
                f"{row['actual_cost']:.2f}",
                f"{row['savings']:.2f}",
                f"{row['savings_percent']:.2f}%" if row['savings_percent'] else 'N/A'
            ])
        
        client = execute_query("SELECT name FROM clients WHERE id = %s", (client_id,), fetch_one=True)
        filename = f"savings_{client['name'].replace(' ', '_')}_{datetime.utcnow().strftime('%Y%m%d')}.csv"
        
        response = Response(output.getvalue(), mimetype='text/csv')
        response.headers['Content-Disposition'] = f'attachment; filename={filename}'
        
        log_system_event('export_savings', 'info', f'Savings data exported for client {client_id}', client_id)
        
        return response
        
    except Exception as e:
        logger.error(f"Export savings error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/client/<client_id>/export/switch-history', methods=['GET'])
def export_switch_history(client_id):
    """Export switch history as CSV"""
    import csv
    from io import StringIO
    from flask import Response
    
    try:
        history = execute_query("""
            SELECT 
                timestamp,
                new_instance_id,
                instance_type,
                from_mode,
                to_mode,
                from_pool_id,
                to_pool_id,
                event_trigger,
                on_demand_price,
                old_spot_price,
                new_spot_price,
                savings_impact
            FROM switch_events se
            LEFT JOIN instances i ON i.id = se.new_instance_id
            WHERE se.client_id = %s
            ORDER BY timestamp DESC
        """, (client_id,), fetch=True)
        
        output = StringIO()
        writer = csv.writer(output)
        
        writer.writerow([
            'Timestamp', 'Instance ID', 'Instance Type', 'From Mode', 'To Mode',
            'From Pool', 'To Pool', 'Trigger', 'On-Demand Price ($)',
            'Old Spot Price ($)', 'New Spot Price ($)', 'Savings Impact ($)'
        ])
        
        for row in history:
            writer.writerow([
                row['timestamp'].strftime('%Y-%m-%d %H:%M:%S'),
                row['new_instance_id'] or 'N/A',
                row['instance_type'] or 'N/A',
                row['from_mode'] or 'N/A',
                row['to_mode'] or 'N/A',
                row['from_pool_id'] or 'N/A',
                row['to_pool_id'] or 'N/A',
                row['event_trigger'],
                f"{row['on_demand_price']:.6f}" if row['on_demand_price'] else 'N/A',
                f"{row['old_spot_price']:.6f}" if row['old_spot_price'] else 'N/A',
                f"{row['new_spot_price']:.6f}" if row['new_spot_price'] else 'N/A',
                f"{row['savings_impact']:.6f}" if row['savings_impact'] else 'N/A'
            ])
        
        client = execute_query("SELECT name FROM clients WHERE id = %s", (client_id,), fetch_one=True)
        filename = f"switch_history_{client['name'].replace(' ', '_')}_{datetime.utcnow().strftime('%Y%m%d')}.csv"
        
        response = Response(output.getvalue(), mimetype='text/csv')
        response.headers['Content-Disposition'] = f'attachment; filename={filename}'
        
        log_system_event('export_switch_history', 'info', f'Switch history exported for client {client_id}', client_id)
        
        return response
        
    except Exception as e:
        logger.error(f"Export switch history error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/export/global-stats', methods=['GET'])
def export_global_stats():
    """Export global statistics as CSV"""
    import csv
    from io import StringIO
    from flask import Response
    
    try:
        clients = execute_query("""
            SELECT 
                c.id,
                c.name,
                c.status,
                c.total_savings,
                c.last_sync_at,
                COUNT(DISTINCT CASE WHEN a.status = 'online' THEN a.id END) as agents_online,
                COUNT(DISTINCT a.id) as agents_total,
                COUNT(DISTINCT CASE WHEN i.is_active = TRUE THEN i.id END) as active_instances,
                COUNT(DISTINCT CASE WHEN i.current_mode = 'spot' AND i.is_active = TRUE THEN i.id END) as spot_instances
            FROM clients c
            LEFT JOIN agents a ON a.client_id = c.id
            LEFT JOIN instances i ON i.client_id = c.id
            GROUP BY c.id, c.name, c.status, c.total_savings, c.last_sync_at
            ORDER BY c.total_savings DESC
        """, fetch=True)
        
        output = StringIO()
        writer = csv.writer(output)
        
        writer.writerow([
            'Client ID', 'Client Name', 'Status', 'Total Savings ($)',
            'Agents Online', 'Total Agents', 'Active Instances', 'Spot Instances',
            'Last Sync'
        ])
        
        for row in clients:
            writer.writerow([
                row['id'],
                row['name'],
                row['status'],
                f"{row['total_savings']:.2f}",
                row['agents_online'],
                row['agents_total'],
                row['active_instances'],
                row['spot_instances'],
                row['last_sync_at'].strftime('%Y-%m-%d %H:%M:%S') if row['last_sync_at'] else 'Never'
            ])
        
        filename = f"global_stats_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        
        response = Response(output.getvalue(), mimetype='text/csv')
        response.headers['Content-Disposition'] = f'attachment; filename={filename}'
        
        log_system_event('export_global_stats', 'info', 'Global statistics exported')
        
        return response
        
    except Exception as e:
        logger.error(f"Export global stats error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/client/<client_id>/savings', methods=['GET'])
def get_client_savings(client_id):
    """Get savings data for charts"""
    range_param = request.args.get('range', 'monthly')
    
    try:
        if range_param == 'monthly':
            savings = execute_query("""
                SELECT 
                    CONCAT(MONTHNAME(CONCAT(year, '-', month, '-01'))) as name,
                    baseline_cost as onDemandCost,
                    actual_cost as modelCost,
                    savings
                FROM client_savings_monthly
                WHERE client_id = %s
                ORDER BY year DESC, month DESC
                LIMIT 12
            """, (client_id,), fetch=True)
            
            savings = list(reversed(savings)) if savings else []
            
            return jsonify([{
                'name': s['name'],
                'savings': float(s['savings']),
                'onDemandCost': float(s['onDemandCost']),
                'modelCost': float(s['modelCost'])
            } for s in savings])
        
        return jsonify([])
        
    except Exception as e:
        logger.error(f"Get savings error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/client/<client_id>/switch-history', methods=['GET'])
def get_switch_history(client_id):
    """Get switch history"""
    instance_id = request.args.get('instance_id')
    
    try:
        query = """
            SELECT *
            FROM switch_events
            WHERE client_id = %s
        """
        params = [client_id]
        
        if instance_id:
            query += " AND (old_instance_id = %s OR new_instance_id = %s)"
            params.extend([instance_id, instance_id])
        
        query += " ORDER BY timestamp DESC LIMIT 100"
        
        history = execute_query(query, tuple(params), fetch=True)
        
        return jsonify([{
            'id': h['id'],
            'instanceId': h['new_instance_id'],
            'timestamp': h['timestamp'].isoformat(),
            'fromMode': h['from_mode'],
            'toMode': h['to_mode'],
            'fromPool': h['from_pool_id'] or 'n/a',
            'toPool': h['to_pool_id'] or 'n/a',
            'trigger': h['event_trigger'],
            'price': float(h['new_spot_price'] or h['on_demand_price'] or 0),
            'savingsImpact': float(h['savings_impact'] or 0)
        } for h in history])
        
    except Exception as e:
        logger.error(f"Get switch history error: {e}")
        return jsonify({'error': str(e)}), 500

# ==============================================================================
# ADMIN DASHBOARD API ENDPOINTS (FIXED MODEL STATUS)
# ==============================================================================

@app.route('/api/admin/stats', methods=['GET'])
def get_global_stats():
    """Get global statistics"""
    try:
        stats = execute_query("""
            SELECT 
                COUNT(DISTINCT c.id) as total_accounts,
                COUNT(DISTINCT CASE WHEN a.status = 'online' THEN a.id END) as agents_online,
                COUNT(DISTINCT a.id) as agents_total,
                COUNT(DISTINCT sp.id) as pools_covered,
                SUM(c.total_savings) as total_savings,
                COUNT(se.id) as total_switches,
                COUNT(CASE WHEN se.event_trigger = 'manual' THEN 1 END) as manual_switches,
                COUNT(CASE WHEN se.event_trigger = 'model' THEN 1 END) as model_switches
            FROM clients c
            LEFT JOIN agents a ON a.client_id = c.id
            LEFT JOIN spot_pools sp ON sp.region = 'ap-south-1'
            LEFT JOIN switch_events se ON se.client_id = c.id
        """, fetch_one=True)
        
        # FIXED: Properly report model status
        backend_health = 'Healthy'
        if not model_status['decision_engine_loaded']:
            backend_health = 'Decision Engine Not Loaded'
        elif not model_status['ml_models_loaded'] and config.DECISION_ENGINE_TYPE == 'ml_based':
            backend_health = 'ML Models Not Loaded (Using Rules)'
        
        return jsonify({
            'totalAccounts': stats['total_accounts'] or 0,
            'agentsOnline': stats['agents_online'] or 0,
            'agentsTotal': stats['agents_total'] or 0,
            'poolsCovered': stats['pools_covered'] or 0,
            'totalSavings': float(stats['total_savings'] or 0),
            'totalSwitches': stats['total_switches'] or 0,
            'manualSwitches': stats['manual_switches'] or 0,
            'modelSwitches': stats['model_switches'] or 0,
            'backendHealth': backend_health,
            'decisionEngineLoaded': model_status['decision_engine_loaded'],
            'mlModelsLoaded': model_status['ml_models_loaded']
        })
        
    except Exception as e:
        logger.error(f"Get global stats error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/clients', methods=['GET'])
def get_all_clients():
    """Get all clients"""
    try:
        clients = execute_query("""
            SELECT 
                c.*,
                COUNT(DISTINCT CASE WHEN a.status = 'online' THEN a.id END) as agents_online,
                COUNT(DISTINCT a.id) as agents_total,
                COUNT(DISTINCT CASE WHEN i.is_active = TRUE THEN i.id END) as instances
            FROM clients c
            LEFT JOIN agents a ON a.client_id = c.id
            LEFT JOIN instances i ON i.client_id = c.id
            GROUP BY c.id
            ORDER BY c.created_at DESC
        """, fetch=True)
        
        return jsonify([{
            'id': client['id'],
            'name': client['name'],
            'status': client['status'],
            'agentsOnline': client['agents_online'] or 0,
            'agentsTotal': client['agents_total'] or 0,
            'instances': client['instances'] or 0,
            'totalSavings': float(client['total_savings'] or 0),
            'lastSync': client['last_sync_at'].isoformat() if client['last_sync_at'] else None
        } for client in clients])
        
    except Exception as e:
        logger.error(f"Get all clients error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/activity', methods=['GET'])
def get_recent_activity():
    """Get recent system activity from system_events"""
    try:
        events = execute_query("""
            SELECT 
                event_type as type,
                message as text,
                created_at as time,
                severity
            FROM system_events
            WHERE severity IN ('info', 'warning')
            ORDER BY created_at DESC
            LIMIT 10
        """, fetch=True)
        
        activity = []
        for i, event in enumerate(events):
            event_type_map = {
                'switch_completed': 'switch',
                'agent_registered': 'agent',
                'manual_switch_requested': 'switch',
                'savings_computed': 'event'
            }
            
            activity.append({
                'id': i + 1,
                'type': event_type_map.get(event['type'], 'event'),
                'text': event['text'],
                'time': event['time'].isoformat() if event['time'] else 'unknown'
            })
        
        return jsonify(activity)
        
    except Exception as e:
        logger.error(f"Get activity error: {e}")
        return jsonify({'error': str(e)}), 500

# ==============================================================================
# ADMIN FUNCTIONAL PAGES ENDPOINTS
# ==============================================================================

@app.route('/api/admin/system-health', methods=['GET'])
def get_system_health():
    """Get detailed system health information"""
    try:
        # Check database connection
        db_status = 'Connected'
        try:
            execute_query("SELECT 1", fetch_one=True)
        except:
            db_status = 'Disconnected'
        
        # Check decision engine (FIXED)
        if model_status['decision_engine_loaded']:
            if model_status['ml_models_loaded']:
                engine_status = 'Fully Loaded (ML Models Active)'
            else:
                engine_status = 'Loaded (Rule-Based Only)'
        else:
            engine_status = 'Not Loaded'
        
        # Get connection pool stats
        pool_active = connection_pool._cnx_queue.qsize() if connection_pool else 0
        
        return jsonify({
            'apiStatus': 'Healthy',
            'database': db_status,
            'decisionEngine': engine_status,
            'connectionPool': f'{pool_active}/{config.DB_POOL_SIZE}',
            'timestamp': datetime.utcnow().isoformat(),
            'modelStatus': {
                'decisionEngineLoaded': model_status['decision_engine_loaded'],
                'mlModelsLoaded': model_status['ml_models_loaded'],
                'engineType': config.DECISION_ENGINE_TYPE
            }
        })
    except Exception as e:
        logger.error(f"System health check error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/pool-statistics', methods=['GET'])
def get_pool_statistics():
    """Get statistics for all spot pools"""
    try:
        stats = execute_query("""
            SELECT 
                sp.id,
                sp.instance_type,
                sp.region,
                sp.az,
                COUNT(sps.id) as sample_count,
                MIN(sps.price) as min_price,
                MAX(sps.price) as max_price,
                AVG(sps.price) as avg_price,
                MAX(sps.captured_at) as last_capture
            FROM spot_pools sp
            LEFT JOIN spot_price_snapshots sps ON sps.pool_id = sp.id
                AND sps.captured_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            GROUP BY sp.id, sp.instance_type, sp.region, sp.az
            ORDER BY sp.instance_type, sp.region, sp.az
        """, fetch=True)
        
        return jsonify([{
            'poolId': s['id'],
            'instanceType': s['instance_type'],
            'region': s['region'],
            'az': s['az'],
            'sampleCount': s['sample_count'] or 0,
            'minPrice': float(s['min_price'] or 0),
            'maxPrice': float(s['max_price'] or 0),
            'avgPrice': float(s['avg_price'] or 0),
            'lastCapture': s['last_capture'].isoformat() if s['last_capture'] else None
        } for s in stats])
    except Exception as e:
        logger.error(f"Pool statistics error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/agent-health', methods=['GET'])
def get_agent_health():
    """Get health status of all agents"""
    try:
        agents = execute_query("""
            SELECT 
                a.id,
                a.client_id,
                c.name as client_name,
                a.status,
                a.enabled,
                a.last_heartbeat,
                a.instance_count,
                a.agent_version,
                TIMESTAMPDIFF(MINUTE, a.last_heartbeat, NOW()) as minutes_since_heartbeat
            FROM agents a
            JOIN clients c ON c.id = a.client_id
            ORDER BY a.last_heartbeat DESC
        """, fetch=True)
        
        return jsonify([{
            'id': a['id'],
            'clientId': a['client_id'],
            'clientName': a['client_name'],
            'status': a['status'],
            'enabled': a['enabled'],
            'lastHeartbeat': a['last_heartbeat'].isoformat() if a['last_heartbeat'] else None,
            'instanceCount': a['instance_count'] or 0,
            'agentVersion': a['agent_version'],
            'minutesSinceHeartbeat': a['minutes_since_heartbeat'] or 0,
            'healthy': a['minutes_since_heartbeat'] < 5 if a['minutes_since_heartbeat'] else False
        } for a in agents])
    except Exception as e:
        logger.error(f"Agent health error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/agents', methods=['GET'])
def get_all_agents_global():
    """Get all agents across all clients"""
    try:
        agents = execute_query("""
            SELECT 
                a.*,
                c.name as client_name
            FROM agents a
            JOIN clients c ON c.id = a.client_id
            ORDER BY a.last_heartbeat DESC
        """, fetch=True)
        
        return jsonify([{
            'id': a['id'],
            'clientId': a['client_id'],
            'clientName': a['client_name'],
            'status': a['status'],
            'enabled': a['enabled'],
            'lastHeartbeat': a['last_heartbeat'].isoformat() if a['last_heartbeat'] else None,
            'instanceCount': a['instance_count'] or 0,
            'agentVersion': a['agent_version'],
            'hostname': a['hostname']
        } for a in agents])
    except Exception as e:
        logger.error(f"Get all agents error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/instances', methods=['GET'])
def get_all_instances_global():
    """Get all instances across all clients with filters"""
    status = request.args.get('status', 'all')
    mode = request.args.get('mode', 'all')
    search = request.args.get('search', '')
    
    try:
        query = """
            SELECT 
                i.*,
                c.name as client_name
            FROM instances i
            JOIN clients c ON c.id = i.client_id
            WHERE 1=1
        """
        params = []
        
        if status == 'active':
            query += " AND i.is_active = TRUE"
        elif status == 'terminated':
            query += " AND i.is_active = FALSE"
        
        if mode != 'all':
            query += " AND i.current_mode = %s"
            params.append(mode)
        
        if search:
            query += " AND (i.id LIKE %s OR i.instance_type LIKE %s OR c.name LIKE %s)"
            params.extend([f'%{search}%', f'%{search}%', f'%{search}%'])
        
        query += " ORDER BY i.created_at DESC LIMIT 1000"
        
        instances = execute_query(query, tuple(params), fetch=True)
        
        return jsonify([{
            'id': inst['id'],
            'clientId': inst['client_id'],
            'clientName': inst['client_name'],
            'type': inst['instance_type'],
            'region': inst['region'],
            'az': inst['az'],
            'mode': inst['current_mode'],
            'poolId': inst['current_pool_id'] or 'n/a',
            'spotPrice': float(inst['spot_price'] or 0),
            'onDemandPrice': float(inst['ondemand_price'] or 0),
            'isActive': inst['is_active']
        } for inst in instances])
    except Exception as e:
        logger.error(f"Get all instances error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/client/instances/<instance_id>/logs', methods=['GET'])
def get_instance_logs(instance_id):
    """Get activity logs for a specific instance"""
    limit = int(request.args.get('limit', 50))
    
    try:
        logs = execute_query("""
            SELECT 
                se.id,
                se.timestamp,
                se.event_trigger,
                se.from_mode,
                se.to_mode,
                se.from_pool_id,
                se.to_pool_id,
                se.savings_impact,
                'switch' as event_type
            FROM switch_events se
            WHERE se.old_instance_id = %s OR se.new_instance_id = %s
            
            UNION ALL
            
            SELECT 
                rs.id,
                rs.created_at as timestamp,
                rs.recommended_action as event_trigger,
                NULL as from_mode,
                rs.recommended_mode as to_mode,
                NULL as from_pool_id,
                rs.recommended_pool_id as to_pool_id,
                rs.expected_savings_per_hour as savings_impact,
                'decision' as event_type
            FROM risk_scores rs
            WHERE rs.instance_id = %s
            
            ORDER BY timestamp DESC
            LIMIT %s
        """, (instance_id, instance_id, instance_id, limit), fetch=True)
        
        return jsonify([{
            'id': log['id'],
            'timestamp': log['timestamp'].isoformat(),
            'eventType': log['event_type'],
            'trigger': log['event_trigger'],
            'fromMode': log['from_mode'],
            'toMode': log['to_mode'],
            'fromPool': log['from_pool_id'],
            'toPool': log['to_pool_id'],
            'savingsImpact': float(log['savings_impact'] or 0)
        } for log in logs])
    except Exception as e:
        logger.error(f"Get instance logs error: {e}")
        return jsonify({'error': str(e)}), 500

# ==============================================================================
# HEALTH CHECK (UPDATED)
# ==============================================================================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        execute_query("SELECT 1", fetch_one=True)
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'decision_engine_loaded': model_status['decision_engine_loaded'],
            'ml_models_loaded': model_status['ml_models_loaded'],
            'database': 'connected',
            'connection_pool': 'active',
            'decision_engine_type': config.DECISION_ENGINE_TYPE
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

# ==============================================================================
# APPLICATION STARTUP
# ==============================================================================

def initialize_app():
    """Initialize application on startup"""
    logger.info("="*80)
    logger.info("AWS Spot Optimizer - Central Server Starting (UPDATED v2.1.0)")
    logger.info("="*80)
    
    # Initialize connection pool
    init_db_pool()
    
    # Load decision engine
    try:
        init_decision_engine()
    except Exception as e:
        logger.error(f"Failed to load decision engine: {e}")
        logger.warning("Server will run without decision engine capabilities")
    
    # Start scheduled jobs
    scheduler = BackgroundScheduler()
    
    scheduler.add_job(compute_monthly_savings_job, 'cron', hour=1, minute=0)
    logger.info("✓ Scheduled monthly savings computation job")
    
    scheduler.add_job(cleanup_old_data_job, 'cron', hour=2, minute=0)
    logger.info("✓ Scheduled data cleanup job")
    
    scheduler.start()
    
    logger.info("Server initialization complete")
    logger.info(f"Decision Engine: {config.DECISION_ENGINE_TYPE}")
    logger.info(f"  - Decision Engine Loaded: {model_status['decision_engine_loaded']}")
    logger.info(f"  - ML Models Loaded: {model_status['ml_models_loaded']}")
    logger.info(f"Listening on {config.HOST}:{config.PORT}")
    logger.info("="*80)
    logger.info("NEW FEATURES IN v2.1.0:")
    logger.info("  ✓ Notification system with create_notification() helper")
    logger.info("  ✓ Global search across clients, instances, and agents")
    logger.info("  ✓ Client statistics with comprehensive charts data")
    logger.info("  ✓ Fixed model status tracking (Decision Engine vs ML Models)")
    logger.info("  ✓ Notifications integrated into key events")
    logger.info("="*80)

# ==============================================================================
# MAIN
# ==============================================================================

# Initialize on import (for gunicorn)
initialize_app()

if __name__ == '__main__':
    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=config.DEBUG
    ):
            return jsonify({'error': 'Agent not found'}), 404
        
        return jsonify({
            'enabled': config_data['enabled'],
            'auto_switch_enabled': config_data['auto_switch_enabled'],
            'auto_terminate_enabled': config_data['auto_terminate_enabled'],
            'min_savings_percent': float(config_data['min_savings_percent']),
            'risk_threshold': float(config_data['risk_threshold']),
            'max_switches_per_week': config_data['max_switches_per_week'],
            'min_pool_duration_hours': config_data['min_pool_duration_hours']
        })
        
    except Exception as e:
        logger.error(f"Get config error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/agents/<agent_id>/decide', methods=['POST'])
@require_client_token
def get_decision(agent_id):
    """Get switching decision from decision engine (FULLY DECOUPLED)"""
    data = request.json
    
    try:
        instance = data['instance']
        pricing = data['pricing']
        
        # Get agent config
        config_data = execute_query("""
            SELECT ac.*, a.enabled, a.auto_switch_enabled
            FROM agent_configs ac
            JOIN agents a ON a.id = ac.agent_id
            WHERE ac.agent_id = %s AND a.client_id = %s
        """, (agent_id, request.client_id), fetch_one=True)
        
        if not config_data
