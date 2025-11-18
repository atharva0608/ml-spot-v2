"""
AWS Spot Optimizer - Admin Dashboard Backend v3.0.0
=================================================================
Production-ready backend with comprehensive admin dashboard APIs
=================================================================
"""

import os
import json
import secrets
import string
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from decimal import Decimal

from dotenv import load_dotenv
load_dotenv()

import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error, pooling
from functools import wraps
from apscheduler.schedulers.background import BackgroundScheduler
from marshmallow import Schema, fields, validate, ValidationError

# ============================================================================
# LOGGING
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('spot_optimizer_server.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURATION
# ============================================================================

@dataclass
class Config:
    DB_HOST: str = os.getenv('DB_HOST', 'localhost')
    DB_PORT: int = int(os.getenv('DB_PORT', 3306))
    DB_USER: str = os.getenv('DB_USER', 'root')
    DB_PASSWORD: str = os.getenv('DB_PASSWORD', 'password')
    DB_NAME: str = os.getenv('DB_NAME', 'spot_optimizer')
    DB_POOL_SIZE: int = int(os.getenv('DB_POOL_SIZE', 15))
    DB_POOL_NAME: str = 'spot_optimizer_pool'
    
    DECISION_ENGINE_TYPE: str = os.getenv('DECISION_ENGINE_TYPE', 'hybrid')
    MODEL_DIR: Path = Path(os.getenv('MODEL_DIR', './models'))
    REGION: str = os.getenv('AWS_REGION', 'ap-south-1')
    
    HOST: str = os.getenv('HOST', '0.0.0.0')
    PORT: int = int(os.getenv('PORT', 5000))
    DEBUG: bool = os.getenv('DEBUG', 'False').lower() == 'true'
    
    AGENT_HEARTBEAT_TIMEOUT_MINUTES: int = 5
    
config = Config()

# ============================================================================
# FLASK APP
# ============================================================================

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# ============================================================================
# DATABASE CONNECTION POOL
# ============================================================================

connection_pool: Optional[pooling.MySQLConnectionPool] = None

def init_db_pool() -> None:
    global connection_pool
    try:
        connection_pool = pooling.MySQLConnectionPool(
            pool_name=config.DB_POOL_NAME,
            pool_size=config.DB_POOL_SIZE,
            pool_reset_session=True,
            host=config.DB_HOST,
            port=config.DB_PORT,
            user=config.DB_USER,
            password=config.DB_PASSWORD,
            database=config.DB_NAME,
            autocommit=False
        )
        logger.info(f"✓ Database pool initialized (size: {config.DB_POOL_SIZE})")
    except Error as e:
        logger.critical(f"Failed to initialize database pool: {e}")
        raise

def get_db_connection():
    return connection_pool.get_connection()

def execute_query(query: str, params: Optional[tuple] = None, fetch: bool = False, 
                  fetch_one: bool = False, commit: bool = True) -> Optional[Any]:
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
            result = cursor.rowcount
            
        if commit and not (fetch or fetch_one):
            connection.commit()
            
        return result
    except Error as e:
        if connection:
            connection.rollback()
        logger.error(f"Query error: {e}")
        raise
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def generate_client_token() -> str:
    return f"token-{secrets.token_hex(16)}"

def generate_client_id() -> str:
    return f"client-{secrets.token_hex(4)}"

def serialize_decimal(obj):
    """JSON serializer for Decimal objects"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.route('/health', methods=['GET'])
def health_check():
    try:
        # Test database connection
        result = execute_query("SELECT 1", fetch_one=True)
        db_status = "healthy" if result else "unhealthy"

        # Get decision engine status
        engine_status = execute_query("""
            SELECT engine_type, model_version, is_active, loaded_at
            FROM decision_engine_status
            WHERE region = %s
            ORDER BY loaded_at DESC
            LIMIT 1
        """, (config.REGION,), fetch_one=True)

        decision_engine_loaded = False
        if engine_status and engine_status['is_active']:
            decision_engine_loaded = True

    except:
        db_status = "unhealthy"
        decision_engine_loaded = False

    return jsonify({
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
        "decision_engine": {
            "loaded": decision_engine_loaded,
            "type": engine_status['engine_type'] if engine_status else None,
            "version": engine_status['model_version'] if engine_status else None
        },
        "timestamp": datetime.now().isoformat(),
        "version": "3.0.0"
    })

# ============================================================================
# ADMIN APIs - GLOBAL STATS
# ============================================================================

@app.route('/api/admin/stats', methods=['GET'])
def get_global_stats():
    """Get global admin statistics across all clients"""
    try:
        # Get total metrics
        totals = execute_query("""
            SELECT
                COUNT(DISTINCT c.id) as total_clients,
                COUNT(DISTINCT CASE WHEN a.retired_at IS NULL THEN a.id END) as total_agents,
                COUNT(DISTINCT CASE WHEN i.is_active = TRUE THEN i.id END) as total_instances,
                COALESCE(SUM(c.total_savings), 0) as total_savings
            FROM clients c
            LEFT JOIN agents a ON a.client_id = c.id
            LEFT JOIN instances i ON i.client_id = c.id
        """, fetch_one=True)
        
        # Get switch counts
        switch_stats = execute_query("""
            SELECT
                COUNT(CASE WHEN event_trigger = 'manual' AND timestamp >= CURDATE() THEN 1 END) as manual_switches_today,
                COUNT(CASE WHEN event_trigger = 'model' AND timestamp >= CURDATE() THEN 1 END) as model_switches_today,
                COUNT(CASE WHEN timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as total_switches_24h
            FROM switch_events
        """, fetch_one=True)
        
        # Get daily savings for graph (last 30 days)
        daily_savings = execute_query("""
            SELECT
                DATE(timestamp) as date,
                SUM(savings_impact) as savings
            FROM switch_events
            WHERE timestamp >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE(timestamp)
            ORDER BY date ASC
        """, fetch=True)
        
        # Get top saving client
        top_client = execute_query("""
            SELECT id, name, total_savings
            FROM clients
            WHERE total_savings > 0
            ORDER BY total_savings DESC
            LIMIT 1
        """, fetch_one=True)
        
        # Database status
        db_status = execute_query("SELECT COUNT(*) as count FROM clients", fetch_one=True)
        
        return jsonify({
            "status": "success",
            "data": {
                "totals": {
                    "clients": totals['total_clients'] or 0,
                    "agents": totals['total_agents'] or 0,
                    "instances": totals['total_instances'] or 0,
                    "savings": float(totals['total_savings'] or 0)
                },
                "switches": {
                    "manual_today": switch_stats['manual_switches_today'] or 0,
                    "model_today": switch_stats['model_switches_today'] or 0,
                    "total_24h": switch_stats['total_switches_24h'] or 0
                },
                "daily_savings": [
                    {"date": str(row['date']), "savings": float(row['savings'] or 0)}
                    for row in (daily_savings or [])
                ],
                "top_client": {
                    "id": top_client['id'] if top_client else None,
                    "name": top_client['name'] if top_client else None,
                    "savings": float(top_client['total_savings'] or 0) if top_client else 0
                },
                "system_health": {
                    "database": "online" if db_status else "offline",
                    "backend": "online"
                }
            }
        }, default=serialize_decimal)
    except Exception as e:
        logger.error(f"Error getting global stats: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

# ============================================================================
# ADMIN APIs - CLIENT MANAGEMENT
# ============================================================================

@app.route('/api/admin/clients', methods=['GET'])
def get_all_clients():
    """Get all clients with summary metrics"""
    try:
        clients = execute_query("""
            SELECT 
                c.id, c.name, c.company_name, c.status, c.total_savings,
                c.created_at, c.last_sync_at,
                vs.agents_online, vs.agents_total, vs.active_instances,
                vs.spot_instances, vs.ondemand_instances,
                vs.monthly_savings_estimate,
                vs.manual_switches_today, vs.model_switches_today
            FROM clients c
            LEFT JOIN v_client_summary vs ON vs.id = c.id
            ORDER BY c.created_at DESC
        """, fetch=True)
        
        return jsonify({
            "status": "success",
            "data": clients or []
        }, default=serialize_decimal)
    except Exception as e:
        logger.error(f"Error getting clients: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/admin/clients/create', methods=['POST'])
def create_client():
    """Create a new client"""
    try:
        data = request.get_json()
        name = data.get('name')
        company_name = data.get('company_name', name)
        
        if not name:
            return jsonify({"status": "error", "error": "Name is required"}), 400
        
        client_id = generate_client_id()
        client_token = generate_client_token()
        
        execute_query("""
            INSERT INTO clients (id, name, company_name, status, client_token)
            VALUES (%s, %s, %s, 'active', %s)
        """, (client_id, name, company_name, client_token))
        
        return jsonify({
            "status": "success",
            "data": {
                "id": client_id,
                "name": name,
                "company_name": company_name,
                "token": client_token
            }
        })
    except Error as e:
        if e.errno == 1062:  # Duplicate entry
            return jsonify({"status": "error", "error": "Client name already exists"}), 409
        logger.error(f"Error creating client: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/admin/clients/<client_id>', methods=['DELETE'])
def delete_client(client_id):
    """Delete a client"""
    try:
        execute_query("DELETE FROM clients WHERE id = %s", (client_id,))
        return jsonify({"status": "success"})
    except Exception as e:
        logger.error(f"Error deleting client: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/admin/clients/<client_id>/token', methods=['GET'])
def get_client_token(client_id):
    """Get client token"""
    try:
        result = execute_query("""
            SELECT client_token FROM clients WHERE id = %s
        """, (client_id,), fetch_one=True)
        
        if not result:
            return jsonify({"status": "error", "error": "Client not found"}), 404
        
        return jsonify({
            "status": "success",
            "data": {"token": result['client_token']}
        })
    except Exception as e:
        logger.error(f"Error getting client token: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/admin/clients/<client_id>/regenerate-token', methods=['POST'])
def regenerate_client_token(client_id):
    """Regenerate client token"""
    try:
        new_token = generate_client_token()
        execute_query("""
            UPDATE clients SET client_token = %s WHERE id = %s
        """, (new_token, client_id))
        
        return jsonify({
            "status": "success",
            "data": {"token": new_token}
        })
    except Exception as e:
        logger.error(f"Error regenerating token: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

# ============================================================================
# CLIENT APIs - DETAILS
# ============================================================================

@app.route('/api/client/<client_id>', methods=['GET'])
def get_client_details(client_id):
    """Get detailed client information"""
    try:
        client = execute_query("""
            SELECT 
                c.*,
                vs.agents_online, vs.agents_total, vs.active_instances,
                vs.manual_switches_today, vs.model_switches_today,
                vs.monthly_savings_estimate
            FROM clients c
            LEFT JOIN v_client_summary vs ON vs.id = c.id
            WHERE c.id = %s
        """, (client_id,), fetch_one=True)
        
        if not client:
            return jsonify({"status": "error", "error": "Client not found"}), 404
        
        # Get last decision
        last_decision = execute_query("""
            SELECT decision, reason, risk_score, created_at, target_pool_id
            FROM switch_decisions
            WHERE client_id = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (client_id,), fetch_one=True)
        
        return jsonify({
            "status": "success",
            "data": {
                **client,
                "last_decision": last_decision
            }
        }, default=serialize_decimal)
    except Exception as e:
        logger.error(f"Error getting client details: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

# ============================================================================
# AGENT APIs
# ============================================================================

@app.route('/api/client/<client_id>/agents', methods=['GET'])
def get_client_agents(client_id):
    """Get all agents for a client"""
    try:
        include_retired = request.args.get('include_retired', 'false').lower() == 'true'
        
        query = """
            SELECT 
                a.*,
                COUNT(DISTINCT i.id) as instance_count,
                COUNT(DISTINCT CASE WHEN se.timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN se.id END) as recent_switches,
                ac.min_savings_percent, ac.risk_threshold, ac.max_switches_per_week,
                TIMESTAMPDIFF(MINUTE, a.last_heartbeat, NOW()) as minutes_since_heartbeat
            FROM agents a
            LEFT JOIN instances i ON i.agent_id = a.id AND i.is_active = TRUE
            LEFT JOIN switch_events se ON se.agent_id = a.id
            LEFT JOIN agent_configs ac ON ac.agent_id = a.id
            WHERE a.client_id = %s
        """
        
        if not include_retired:
            query += " AND a.retired_at IS NULL"
        
        query += " GROUP BY a.id ORDER BY a.created_at DESC"
        
        agents = execute_query(query, (client_id,), fetch=True)
        
        return jsonify({
            "status": "success",
            "data": agents or []
        }, default=serialize_decimal)
    except Exception as e:
        logger.error(f"Error getting agents: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/agent/<agent_id>/toggle', methods=['POST'])
def toggle_agent(agent_id):
    """Enable/disable an agent"""
    try:
        data = request.get_json()
        enabled = data.get('enabled', True)
        
        execute_query("""
            UPDATE agents SET enabled = %s WHERE id = %s
        """, (enabled, agent_id))
        
        return jsonify({"status": "success"})
    except Exception as e:
        logger.error(f"Error toggling agent: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/agent/<agent_id>/auto-switch', methods=['POST'])
def toggle_agent_auto_switch(agent_id):
    """Toggle auto-switch for an agent"""
    try:
        data = request.get_json()
        auto_switch = data.get('enabled', True)
        
        execute_query("""
            UPDATE agents SET auto_switch_enabled = %s WHERE id = %s
        """, (auto_switch, agent_id))
        
        return jsonify({"status": "success"})
    except Exception as e:
        logger.error(f"Error toggling auto-switch: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/agent/<agent_id>/auto-terminate', methods=['POST'])
def toggle_agent_auto_terminate(agent_id):
    """Toggle auto-terminate for an agent"""
    try:
        data = request.get_json()
        auto_terminate = data.get('enabled', True)
        
        execute_query("""
            UPDATE agents SET auto_terminate_enabled = %s WHERE id = %s
        """, (auto_terminate, agent_id))
        
        return jsonify({"status": "success"})
    except Exception as e:
        logger.error(f"Error toggling auto-terminate: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/agent/<agent_id>/config', methods=['GET', 'POST'])
def agent_config(agent_id):
    """Get or update agent configuration"""
    try:
        if request.method == 'GET':
            config = execute_query("""
                SELECT * FROM agent_configs WHERE agent_id = %s
            """, (agent_id,), fetch_one=True)
            
            return jsonify({
                "status": "success",
                "data": config or {}
            }, default=serialize_decimal)
        else:
            data = request.get_json()
            execute_query("""
                INSERT INTO agent_configs (agent_id, min_savings_percent, risk_threshold, max_switches_per_week, min_pool_duration_hours)
                VALUES (%s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    min_savings_percent = VALUES(min_savings_percent),
                    risk_threshold = VALUES(risk_threshold),
                    max_switches_per_week = VALUES(max_switches_per_week),
                    min_pool_duration_hours = VALUES(min_pool_duration_hours)
            """, (agent_id, data.get('min_savings_percent', 10.0), data.get('risk_threshold', 0.7),
                  data.get('max_switches_per_week', 3), data.get('min_pool_duration_hours', 24)))
            
            return jsonify({"status": "success"})
    except Exception as e:
        logger.error(f"Error with agent config: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/agent/<agent_id>', methods=['DELETE'])
def delete_agent(agent_id):
    """Delete (retire) an agent"""
    try:
        execute_query("""
            UPDATE agents 
            SET retired_at = NOW(), retirement_reason = 'Manually deleted by admin'
            WHERE id = %s
        """, (agent_id,))
        
        return jsonify({"status": "success"})
    except Exception as e:
        logger.error(f"Error deleting agent: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

# ============================================================================
# INSTANCE APIs
# ============================================================================

@app.route('/api/client/<client_id>/instances', methods=['GET'])
def get_client_instances(client_id):
    """Get all instances for a client"""
    try:
        instances = execute_query("""
            SELECT 
                i.*,
                a.hostname as agent_hostname,
                a.logical_agent_id,
                (i.ondemand_price - COALESCE(i.spot_price, 0)) as hourly_savings,
                CASE
                    WHEN i.current_mode = 'spot' AND i.ondemand_price > 0
                    THEN ((i.ondemand_price - COALESCE(i.spot_price, 0)) / i.ondemand_price * 100)
                    ELSE 0.00
                END as savings_percent
            FROM instances i
            LEFT JOIN agents a ON a.id = i.agent_id
            WHERE i.client_id = %s AND i.is_active = TRUE
            ORDER BY i.created_at DESC
        """, (client_id,), fetch=True)
        
        return jsonify({
            "status": "success",
            "data": instances or []
        }, default=serialize_decimal)
    except Exception as e:
        logger.error(f"Error getting instances: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/instance/<instance_id>/pools', methods=['GET'])
def get_instance_alternate_pools(instance_id):
    """Get alternate spot pools for an instance"""
    try:
        # Get instance details
        instance = execute_query("""
            SELECT instance_type, region, current_pool_id, spot_price, ondemand_price
            FROM instances WHERE id = %s
        """, (instance_id,), fetch_one=True)
        
        if not instance:
            return jsonify({"status": "error", "error": "Instance not found"}), 404
        
        # Get alternate pools
        pools = execute_query("""
            SELECT 
                sp.id as pool_id,
                sp.az,
                sps.price as spot_price,
                sps.captured_at as last_updated,
                ((%s - sps.price) / %s * 100) as savings_vs_od
            FROM spot_pools sp
            JOIN spot_price_snapshots sps ON sps.pool_id = sp.id
            WHERE sp.instance_type = %s 
            AND sp.region = %s
            AND sp.id != %s
            AND sps.id IN (
                SELECT MAX(id) FROM spot_price_snapshots 
                WHERE pool_id = sp.id
                GROUP BY pool_id
            )
            ORDER BY savings_vs_od DESC
            LIMIT 10
        """, (instance['ondemand_price'], instance['ondemand_price'],
              instance['instance_type'], instance['region'], instance['current_pool_id'] or ''), fetch=True)
        
        return jsonify({
            "status": "success",
            "data": {
                "current": {
                    "pool_id": instance['current_pool_id'],
                    "spot_price": float(instance['spot_price'] or 0),
                    "ondemand_price": float(instance['ondemand_price'] or 0)
                },
                "alternate_pools": pools or [],
                "ondemand": {
                    "price": float(instance['ondemand_price'] or 0)
                }
            }
        }, default=serialize_decimal)
    except Exception as e:
        logger.error(f"Error getting alternate pools: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/instance/<instance_id>/switch', methods=['POST'])
def manual_instance_switch(instance_id):
    """Manually switch an instance to a different pool"""
    try:
        data = request.get_json()
        target_mode = data.get('target_mode', 'spot')
        target_pool_id = data.get('target_pool_id')
        
        # Get instance and agent
        instance = execute_query("""
            SELECT agent_id FROM instances WHERE id = %s
        """, (instance_id,), fetch_one=True)
        
        if not instance or not instance['agent_id']:
            return jsonify({"status": "error", "error": "Instance or agent not found"}), 404
        
        # Create switch command
        execute_query("""
            INSERT INTO pending_switch_commands (agent_id, instance_id, target_mode, target_pool_id, priority)
            VALUES (%s, %s, %s, %s, 10)
        """, (instance['agent_id'], instance_id, target_mode, target_pool_id))
        
        return jsonify({"status": "success"})
    except Exception as e:
        logger.error(f"Error creating switch command: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

# ============================================================================
# SWITCH HISTORY APIs
# ============================================================================

@app.route('/api/client/<client_id>/switch-history', methods=['GET'])
def get_switch_history(client_id):
    """Get switch history for a client"""
    try:
        # Get filters from query params
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        trigger_type = request.args.get('trigger_type')
        limit = int(request.args.get('limit', 100))
        
        query = """
            SELECT 
                se.*,
                a.logical_agent_id,
                a.hostname
            FROM switch_events se
            LEFT JOIN agents a ON a.id = se.agent_id
            WHERE se.client_id = %s
        """
        params = [client_id]
        
        if start_date:
            query += " AND se.timestamp >= %s"
            params.append(start_date)
        if end_date:
            query += " AND se.timestamp <= %s"
            params.append(end_date)
        if trigger_type:
            query += " AND se.event_trigger = %s"
            params.append(trigger_type)
        
        query += " ORDER BY se.timestamp DESC LIMIT %s"
        params.append(limit)
        
        history = execute_query(query, tuple(params), fetch=True)
        
        return jsonify({
            "status": "success",
            "data": history or []
        }, default=serialize_decimal)
    except Exception as e:
        logger.error(f"Error getting switch history: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

# ============================================================================
# SAVINGS APIs
# ============================================================================

@app.route('/api/client/<client_id>/savings', methods=['GET'])
def get_client_savings(client_id):
    """Get savings data for a client"""
    try:
        # Daily savings (last 30 days)
        daily_savings = execute_query("""
            SELECT
                DATE(timestamp) as date,
                SUM(savings_impact) as savings,
                COUNT(*) as switch_count
            FROM switch_events
            WHERE client_id = %s
            AND timestamp >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE(timestamp)
            ORDER BY date ASC
        """, (client_id,), fetch=True)
        
        # Monthly savings
        monthly_savings = execute_query("""
            SELECT year, month, savings
            FROM client_savings_monthly
            WHERE client_id = %s
            ORDER BY year DESC, month DESC
            LIMIT 12
        """, (client_id,), fetch=True)
        
        # Savings by instance type
        savings_by_type = execute_query("""
            SELECT 
                i.instance_type,
                SUM(se.savings_impact) as total_savings,
                COUNT(se.id) as switch_count
            FROM switch_events se
            JOIN instances i ON i.id = se.instance_id
            WHERE se.client_id = %s
            GROUP BY i.instance_type
            ORDER BY total_savings DESC
        """, (client_id,), fetch=True)
        
        return jsonify({
            "status": "success",
            "data": {
                "daily": daily_savings or [],
                "monthly": monthly_savings or [],
                "by_instance_type": savings_by_type or []
            }
        }, default=serialize_decimal)
    except Exception as e:
        logger.error(f"Error getting savings data: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

# ============================================================================
# LIVE DATA APIs
# ============================================================================

@app.route('/api/client/<client_id>/live-data', methods=['GET'])
def get_client_live_data(client_id):
    """Get recent live data from client agents"""
    try:
        live_data = execute_query("""
            SELECT 
                ald.*,
                a.logical_agent_id,
                a.hostname,
                TIMESTAMPDIFF(SECOND, ald.received_at, NOW()) as seconds_ago
            FROM agent_live_data ald
            JOIN agents a ON a.id = ald.agent_id
            WHERE ald.client_id = %s
            AND ald.received_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
            ORDER BY ald.received_at DESC
            LIMIT 50
        """, (client_id,), fetch=True)
        
        return jsonify({
            "status": "success",
            "data": live_data or []
        }, default=serialize_decimal)
    except Exception as e:
        logger.error(f"Error getting live data: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

# ============================================================================
# SYSTEM HEALTH APIs
# ============================================================================

@app.route('/api/system/health', methods=['GET'])
def get_system_health():
    """Get comprehensive system health information"""
    try:
        # Database health
        db_health = execute_query("""
            SELECT 
                COUNT(*) as total_connections,
                (SELECT COUNT(*) FROM clients) as total_clients,
                (SELECT COUNT(*) FROM agents WHERE retired_at IS NULL) as active_agents
            FROM INFORMATION_SCHEMA.PROCESSLIST
        """, fetch_one=True)
        
        # Decision engine status
        engine_status = execute_query("""
            SELECT * FROM decision_engine_status
            WHERE is_active = TRUE
            ORDER BY loaded_at DESC
            LIMIT 1
        """, fetch_one=True)
        
        # Recent system events
        recent_events = execute_query("""
            SELECT event_type, severity, message, created_at
            FROM system_events
            WHERE severity IN ('error', 'critical')
            ORDER BY created_at DESC
            LIMIT 10
        """, fetch=True)
        
        # Background jobs status
        recent_jobs = execute_query("""
            SELECT job_type, status, items_processed, started_at, completed_at
            FROM cleanup_jobs
            ORDER BY started_at DESC
            LIMIT 5
        """, fetch=True)
        
        return jsonify({
            "status": "success",
            "data": {
                "database": {
                    "status": "online",
                    "connections": db_health['total_connections'] if db_health else 0,
                    "clients": db_health['total_clients'] if db_health else 0,
                    "agents": db_health['active_agents'] if db_health else 0
                },
                "backend": {
                    "status": "online",
                    "version": "3.0.0",
                    "uptime": "running"
                },
                "decision_engine": engine_status or {},
                "recent_errors": recent_events or [],
                "background_jobs": recent_jobs or []
            }
        }, default=serialize_decimal)
    except Exception as e:
        logger.error(f"Error getting system health: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

# ============================================================================
# MODELS APIs
# ============================================================================

@app.route('/api/models/status', methods=['GET'])
def get_models_status():
    """Get decision engine and model status"""
    try:
        models = execute_query("""
            SELECT * FROM decision_engine_status
            ORDER BY loaded_at DESC
        """, fetch=True)
        
        return jsonify({
            "status": "success",
            "data": {
                "models": models or [],
                "config": {
                    "engine_type": config.DECISION_ENGINE_TYPE,
                    "region": config.REGION,
                    "model_dir": str(config.MODEL_DIR)
                }
            }
        }, default=serialize_decimal)
    except Exception as e:
        logger.error(f"Error getting models status: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

# ============================================================================
# AGENT ENDPOINTS (for agent communication)
# ============================================================================

@app.route('/api/agent/register', methods=['POST'])
def agent_register():
    """Register or update an agent"""
    try:
        data = request.get_json()
        client_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        # Verify client token
        client = execute_query("""
            SELECT id FROM clients WHERE client_token = %s
        """, (client_token,), fetch_one=True)
        
        if not client:
            return jsonify({"status": "error", "error": "Invalid client token"}), 401
        
        agent_id = data.get('agent_id') or f"agent-{secrets.token_hex(8)}"
        logical_agent_id = data.get('logical_agent_id', agent_id)
        
        # Upsert agent
        execute_query("""
            INSERT INTO agents (id, logical_agent_id, client_id, hostname, agent_version, last_heartbeat, status)
            VALUES (%s, %s, %s, %s, %s, NOW(), 'online')
            ON DUPLICATE KEY UPDATE
                last_heartbeat = NOW(),
                hostname = VALUES(hostname),
                agent_version = VALUES(agent_version),
                status = 'online'
        """, (agent_id, logical_agent_id, client['id'], data.get('hostname'), data.get('version')))
        
        return jsonify({
            "status": "success",
            "data": {"agent_id": agent_id}
        })
    except Exception as e:
        logger.error(f"Error registering agent: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/agent/heartbeat', methods=['POST'])
def agent_heartbeat():
    """Agent heartbeat"""
    try:
        data = request.get_json()
        agent_id = data.get('agent_id')
        
        execute_query("""
            UPDATE agents 
            SET last_heartbeat = NOW(), status = 'online'
            WHERE id = %s
        """, (agent_id,))
        
        # Get pending commands
        commands = execute_query("""
            SELECT * FROM pending_switch_commands
            WHERE agent_id = %s AND executed_at IS NULL
            ORDER BY priority DESC, created_at ASC
            LIMIT 5
        """, (agent_id,), fetch=True)
        
        return jsonify({
            "status": "success",
            "data": {
                "commands": commands or []
            }
        }, default=serialize_decimal)
    except Exception as e:
        logger.error(f"Error processing heartbeat: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500

# ============================================================================
# DECISION ENGINE INITIALIZATION
# ============================================================================

def initialize_decision_engine():
    """Initialize and register decision engine status"""
    try:
        # Check if models directory exists and contains model files
        model_files_exist = False
        model_version = "not_loaded"

        if config.MODEL_DIR.exists():
            # Look for common model files
            model_files = list(config.MODEL_DIR.glob("*.pkl")) + list(config.MODEL_DIR.glob("*.json"))
            if model_files:
                model_files_exist = True
                # Try to read version from manifest if it exists
                manifest_path = config.MODEL_DIR / "manifest.json"
                if manifest_path.exists():
                    try:
                        with open(manifest_path, 'r') as f:
                            manifest = json.load(f)
                            model_version = manifest.get('version', 'v1.0.0')
                    except:
                        model_version = "v1.0.0"
                else:
                    model_version = "v1.0.0"

        # Register or update decision engine status
        execute_query("""
            INSERT INTO decision_engine_status
            (engine_type, region, model_version, model_path, is_active, loaded_at, decisions_count)
            VALUES (%s, %s, %s, %s, %s, NOW(), 0)
            ON DUPLICATE KEY UPDATE
                is_active = VALUES(is_active),
                loaded_at = NOW(),
                model_version = VALUES(model_version)
        """, (config.DECISION_ENGINE_TYPE, config.REGION, model_version,
              str(config.MODEL_DIR), model_files_exist))

        if model_files_exist:
            logger.info(f"✓ Decision engine registered: {config.DECISION_ENGINE_TYPE} ({model_version})")
        else:
            logger.warning(f"⚠ Decision engine registered but no model files found in {config.MODEL_DIR}")

    except Exception as e:
        logger.error(f"Failed to initialize decision engine status: {e}")

# ============================================================================
# INITIALIZATION
# ============================================================================

def initialize_app():
    """Initialize the application"""
    try:
        init_db_pool()
        logger.info("✓ Database pool initialized successfully")

        # Initialize decision engine status
        initialize_decision_engine()

        logger.info("✓ Application initialized successfully")
    except Exception as e:
        logger.critical(f"Failed to initialize application: {e}")
        raise

# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    initialize_app()
    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=config.DEBUG
    )
