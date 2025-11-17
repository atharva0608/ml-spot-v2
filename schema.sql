-- ============================================================================
-- AWS SPOT OPTIMIZER - COMPLETE FIXED SCHEMA v2.4.0
-- ============================================================================
-- This schema is compatible with:
-- - Backend v2.4.0
-- - Agent v3.0.0
-- - Frontend Dashboard v2.0
-- ============================================================================

DROP DATABASE IF EXISTS spot_optimizer;
CREATE DATABASE spot_optimizer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE spot_optimizer;

-- ============================================================================
-- TABLE: clients
-- ============================================================================

CREATE TABLE clients (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    client_token VARCHAR(255) NOT NULL UNIQUE,
    total_savings DECIMAL(20,4) NOT NULL DEFAULT 0.0000,
    last_sync_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_status (status),
    INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Client accounts with authentication tokens';

-- ============================================================================
-- TABLE: agents (FIXED - ALL MISSING COLUMNS ADDED)
-- ============================================================================

CREATE TABLE agents (
    id VARCHAR(64) PRIMARY KEY,
    logical_agent_id VARCHAR(64) NOT NULL COMMENT 'Persistent logical agent ID across instance switches',
    client_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'online',
    hostname VARCHAR(255) NULL,
    agent_version VARCHAR(32) NULL,
    last_heartbeat TIMESTAMP NULL,
    instance_count INT NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    auto_switch_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    auto_terminate_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    retired_at TIMESTAMP NULL COMMENT 'When agent was retired (soft delete)',
    retirement_reason TEXT NULL COMMENT 'Reason for retirement',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    
    INDEX idx_client_id (client_id),
    INDEX idx_logical_agent_id (logical_agent_id),
    INDEX idx_status (status),
    INDEX idx_last_heartbeat (last_heartbeat DESC),
    INDEX idx_retired_at (retired_at),
    INDEX idx_online_status (status, last_heartbeat, retired_at),
    UNIQUE INDEX idx_logical_active (logical_agent_id, client_id, retired_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Agent instances running on EC2';

-- ============================================================================
-- TABLE: agent_configs
-- ============================================================================

CREATE TABLE agent_configs (
    agent_id VARCHAR(64) PRIMARY KEY,
    min_savings_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    risk_threshold DECIMAL(5,4) NOT NULL DEFAULT 0.7000,
    max_switches_per_week INT NOT NULL DEFAULT 3,
    min_pool_duration_hours INT NOT NULL DEFAULT 24,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Agent-specific configuration thresholds';

-- ============================================================================
-- TABLE: instances (FIXED - MODE VERIFICATION COLUMNS ADDED)
-- ============================================================================

CREATE TABLE instances (
    id VARCHAR(64) PRIMARY KEY,
    client_id VARCHAR(64) NOT NULL,
    agent_id VARCHAR(64) NULL,
    instance_type VARCHAR(64) NOT NULL,
    region VARCHAR(32) NOT NULL,
    az VARCHAR(32) NOT NULL,
    ami_id VARCHAR(64) NULL,
    current_mode VARCHAR(16) NOT NULL DEFAULT 'spot',
    detected_mode VARCHAR(16) NULL COMMENT 'Mode detected by agent verification',
    mode_verification_source VARCHAR(32) NULL COMMENT 'Source: api, metadata, or both',
    mode_last_verified_at TIMESTAMP NULL COMMENT 'Last mode verification timestamp',
    mode_mismatch_count INT NOT NULL DEFAULT 0 COMMENT 'Count of mode mismatches detected',
    current_pool_id VARCHAR(128) NULL,
    spot_price DECIMAL(10,6) NULL,
    ondemand_price DECIMAL(10,6) NULL,
    baseline_ondemand_price DECIMAL(10,6) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    installed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    terminated_at TIMESTAMP NULL,
    last_switch_at TIMESTAMP NULL,
    source_ami_id VARCHAR(64) NULL COMMENT 'Source AMI for instance creation',
    source_snapshot_id VARCHAR(64) NULL COMMENT 'Source snapshot for AMI',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
    
    INDEX idx_client_id (client_id),
    INDEX idx_agent_id (agent_id),
    INDEX idx_is_active (is_active),
    INDEX idx_current_mode (current_mode, is_active),
    INDEX idx_detected_mode (detected_mode, is_active),
    INDEX idx_region_type (region, instance_type),
    INDEX idx_last_switch (last_switch_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='EC2 instances being managed';

-- ============================================================================
-- TABLE: spot_pools
-- ============================================================================

CREATE TABLE spot_pools (
    id VARCHAR(128) PRIMARY KEY,
    instance_type VARCHAR(64) NOT NULL,
    region VARCHAR(32) NOT NULL,
    az VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_instance_type (instance_type),
    INDEX idx_region (region),
    INDEX idx_az (az)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Available spot capacity pools';

-- ============================================================================
-- TABLE: spot_price_snapshots
-- ============================================================================

CREATE TABLE spot_price_snapshots (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    pool_id VARCHAR(128) NOT NULL,
    price DECIMAL(10,6) NOT NULL,
    captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pool_id) REFERENCES spot_pools(id) ON DELETE CASCADE,
    
    INDEX idx_pool_id (pool_id),
    INDEX idx_captured_at (captured_at DESC),
    INDEX idx_pool_time (pool_id, captured_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Historical spot price data';

-- ============================================================================
-- TABLE: ondemand_price_snapshots
-- ============================================================================

CREATE TABLE ondemand_price_snapshots (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    region VARCHAR(32) NOT NULL,
    instance_type VARCHAR(64) NOT NULL,
    price DECIMAL(10,6) NOT NULL,
    captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_region_type (region, instance_type),
    INDEX idx_captured_at (captured_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Historical on-demand price data';

-- ============================================================================
-- TABLE: pending_switch_commands (FIXED - PRIORITY COLUMN ADDED)
-- ============================================================================

CREATE TABLE pending_switch_commands (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_id VARCHAR(64) NOT NULL,
    instance_id VARCHAR(64) NOT NULL,
    target_mode VARCHAR(16) NOT NULL,
    target_pool_id VARCHAR(128) NULL,
    priority INT NOT NULL DEFAULT 0 COMMENT 'Command priority (higher = execute first)',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP NULL,
    execution_attempts INT NOT NULL DEFAULT 0 COMMENT 'Number of execution attempts',
    last_error TEXT NULL COMMENT 'Last execution error message',
    
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    
    INDEX idx_agent_id (agent_id),
    INDEX idx_executed_at (executed_at),
    INDEX idx_agent_priority_executed (agent_id, priority DESC, executed_at, created_at ASC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Pending instance switch commands with priority';

-- ============================================================================
-- TABLE: switch_events (FIXED - ALL TIMING COLUMNS ADDED)
-- ============================================================================

CREATE TABLE switch_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    client_id VARCHAR(64) NOT NULL,
    instance_id VARCHAR(64) NULL,
    agent_id VARCHAR(64) NULL,
    old_instance_id VARCHAR(64) NULL,
    new_instance_id VARCHAR(64) NULL,
    event_trigger VARCHAR(64) NOT NULL COMMENT 'manual, model, interruption',
    execution_status VARCHAR(32) NOT NULL DEFAULT 'completed' COMMENT 'completed, failed, pending',
    from_mode VARCHAR(16) NOT NULL,
    to_mode VARCHAR(16) NOT NULL,
    from_pool_id VARCHAR(128) NULL,
    to_pool_id VARCHAR(128) NULL,
    on_demand_price DECIMAL(10,6) NOT NULL,
    old_spot_price DECIMAL(10,6) NULL,
    new_spot_price DECIMAL(10,6) NULL,
    savings_impact DECIMAL(12,6) NOT NULL,
    snapshot_used BOOLEAN DEFAULT FALSE COMMENT 'Whether snapshot was used',
    snapshot_id VARCHAR(64) NULL COMMENT 'AWS snapshot ID if used',
    old_instance_terminated BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether old instance terminated',
    old_instance_termination_time TIMESTAMP NULL COMMENT 'When old instance was terminated',
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    execution_started_at TIMESTAMP NULL COMMENT 'When execution started',
    execution_completed_at TIMESTAMP NULL COMMENT 'When execution completed',
    execution_duration_seconds INT NULL COMMENT 'Total execution time',
    switch_initiated_at TIMESTAMP NULL COMMENT 'When switch was initiated',
    new_instance_ready_at TIMESTAMP NULL COMMENT 'When new instance became ready',
    traffic_switched_at TIMESTAMP NULL COMMENT 'When traffic was switched',
    old_instance_terminated_at TIMESTAMP NULL COMMENT 'When old instance was terminated',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
    
    INDEX idx_client_id (client_id),
    INDEX idx_agent_id (agent_id),
    INDEX idx_timestamp (timestamp DESC),
    INDEX idx_event_trigger (event_trigger),
    INDEX idx_execution_status (execution_status, timestamp),
    INDEX idx_timing (switch_initiated_at, execution_completed_at),
    INDEX idx_old_instance (old_instance_id),
    INDEX idx_new_instance (new_instance_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='History of instance switch events with detailed timing';

-- ============================================================================
-- TABLE: risk_scores
-- ============================================================================

CREATE TABLE risk_scores (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    pool_id VARCHAR(128) NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    risk_score DECIMAL(5,4) NOT NULL,
    interruption_probability DECIMAL(5,4) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pool_id) REFERENCES spot_pools(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    
    INDEX idx_pool_id (pool_id),
    INDEX idx_client_id (client_id),
    INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Risk scores for spot pools';

-- ============================================================================
-- TABLE: system_events
-- ============================================================================

CREATE TABLE system_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL,
    client_id VARCHAR(64) NULL,
    agent_id VARCHAR(64) NULL,
    instance_id VARCHAR(64) NULL,
    message TEXT NOT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
    
    INDEX idx_event_type (event_type),
    INDEX idx_severity (severity),
    INDEX idx_client_id (client_id),
    INDEX idx_created_at (created_at DESC),
    INDEX idx_severity_time (severity, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='System events and audit trail';

-- ============================================================================
-- TABLE: notifications
-- ============================================================================

CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    message TEXT NOT NULL,
    severity VARCHAR(16) NOT NULL DEFAULT 'info',
    client_id VARCHAR(64) NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    
    INDEX idx_client_id (client_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User notifications';

-- ============================================================================
-- TABLE: ami_snapshots (NEW - FOR AMI CLEANUP AUTOMATION)
-- ============================================================================

CREATE TABLE ami_snapshots (
    id VARCHAR(64) PRIMARY KEY,
    ami_id VARCHAR(64) NOT NULL,
    snapshot_id VARCHAR(64) NOT NULL,
    instance_id VARCHAR(64) NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    agent_id VARCHAR(64) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
    
    INDEX idx_client (client_id),
    INDEX idx_agent (agent_id),
    INDEX idx_ami (ami_id),
    INDEX idx_snapshot (snapshot_id),
    INDEX idx_active (is_active),
    INDEX idx_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Track AMIs and snapshots for automated cleanup';

-- ============================================================================
-- TABLE: instance_launch_tracking (NEW - PREVENT DUPLICATE LAUNCHES)
-- ============================================================================

CREATE TABLE instance_launch_tracking (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_id VARCHAR(64) NOT NULL,
    logical_agent_id VARCHAR(64) NOT NULL,
    instance_id VARCHAR(64) NULL,
    launch_requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    launch_completed_at TIMESTAMP NULL,
    launch_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    error_message TEXT NULL,
    
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    
    INDEX idx_agent (agent_id),
    INDEX idx_logical (logical_agent_id),
    INDEX idx_instance (instance_id),
    INDEX idx_status (launch_status),
    INDEX idx_requested (launch_requested_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Track instance launches to prevent duplicates';

-- ============================================================================
-- TABLE: cleanup_jobs (NEW - TRACK CLEANUP OPERATIONS)
-- ============================================================================

CREATE TABLE cleanup_jobs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    job_type VARCHAR(32) NOT NULL,
    client_id VARCHAR(64) NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    items_processed INT NOT NULL DEFAULT 0,
    items_deleted INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'running',
    error_message TEXT NULL,
    
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    
    INDEX idx_type (job_type),
    INDEX idx_client (client_id),
    INDEX idx_status (status),
    INDEX idx_started (started_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Track cleanup job executions';

-- ============================================================================
-- TABLE: switch_decisions (NEW - AUDIT TRAIL OF DECISIONS)
-- ============================================================================

CREATE TABLE switch_decisions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_id VARCHAR(64) NOT NULL,
    instance_id VARCHAR(64) NOT NULL,
    decision VARCHAR(32) NOT NULL,
    reason TEXT NOT NULL,
    risk_score DECIMAL(5,4) NULL,
    expected_savings DECIMAL(12,6) NULL,
    was_executed BOOLEAN NOT NULL DEFAULT FALSE,
    blocked_reason TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    
    INDEX idx_agent_time (agent_id, created_at DESC),
    INDEX idx_instance (instance_id),
    INDEX idx_decision (decision),
    INDEX idx_executed (was_executed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Audit trail of switch decisions';

-- ============================================================================
-- TABLE: client_savings_monthly (NEW - MONTHLY SAVINGS AGGREGATION)
-- ============================================================================

CREATE TABLE client_savings_monthly (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    client_id VARCHAR(64) NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    baseline_cost DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    actual_cost DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    savings DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_client_year_month (client_id, year, month),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    
    INDEX idx_client (client_id),
    INDEX idx_year_month (year DESC, month DESC),
    INDEX idx_client_year_month (client_id, year DESC, month DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Monthly savings aggregation for reporting';

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Agent-Instance mapping with mode sync status
CREATE OR REPLACE VIEW v_agent_instance_mapping AS
SELECT 
    a.id as agent_id,
    a.logical_agent_id,
    a.client_id,
    a.status as agent_status,
    a.enabled,
    a.auto_switch_enabled,
    a.auto_terminate_enabled,
    a.last_heartbeat,
    a.retired_at,
    i.id as instance_id,
    i.instance_type,
    i.current_mode,
    i.detected_mode,
    i.is_active,
    i.mode_mismatch_count,
    CASE 
        WHEN i.current_mode = i.detected_mode THEN 'synced'
        WHEN i.detected_mode IS NULL THEN 'unknown'
        ELSE 'mismatch'
    END as mode_sync_status,
    TIMESTAMPDIFF(MINUTE, a.last_heartbeat, NOW()) as minutes_since_heartbeat
FROM agents a
LEFT JOIN instances i ON i.agent_id = a.id AND i.is_active = TRUE
WHERE a.retired_at IS NULL;

-- View: Active instances with client info
CREATE OR REPLACE VIEW v_active_instances AS
SELECT 
    i.*,
    c.name as client_name,
    a.status as agent_status,
    a.logical_agent_id,
    a.retired_at,
    (i.ondemand_price - COALESCE(i.spot_price, 0)) as potential_savings,
    CASE 
        WHEN i.current_mode = 'spot' AND i.ondemand_price > 0 
        THEN ((i.ondemand_price - COALESCE(i.spot_price, 0)) / i.ondemand_price * 100)
        ELSE 0.00
    END as savings_percent,
    CASE 
        WHEN i.current_mode = i.detected_mode THEN 'synced'
        WHEN i.detected_mode IS NULL THEN 'unknown'
        ELSE 'mismatch'
    END as mode_sync_status
FROM instances i
JOIN clients c ON c.id = i.client_id
LEFT JOIN agents a ON a.id = i.agent_id
WHERE i.is_active = TRUE;

-- View: Client summary with accurate counts
CREATE OR REPLACE VIEW v_client_summary AS
SELECT 
    c.id,
    c.name,
    c.status,
    c.total_savings,
    c.last_sync_at,
    COUNT(DISTINCT CASE 
        WHEN a.status = 'online' 
        AND a.retired_at IS NULL 
        AND a.last_heartbeat >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
        THEN a.id 
    END) as agents_online,
    COUNT(DISTINCT CASE WHEN a.retired_at IS NULL THEN a.id END) as agents_total,
    COUNT(DISTINCT CASE WHEN a.retired_at IS NOT NULL THEN a.id END) as agents_retired,
    COUNT(DISTINCT CASE WHEN i.is_active = TRUE THEN i.id END) as active_instances,
    COUNT(DISTINCT CASE WHEN i.current_mode = 'spot' AND i.is_active = TRUE THEN i.id END) as spot_instances,
    COUNT(DISTINCT CASE WHEN i.current_mode = 'ondemand' AND i.is_active = TRUE THEN i.id END) as ondemand_instances,
    COALESCE(SUM(CASE WHEN i.is_active = TRUE THEN (i.ondemand_price - COALESCE(i.spot_price, 0)) * 24 * 30 END), 0) as monthly_savings_estimate
FROM clients c
LEFT JOIN agents a ON a.client_id = c.id
LEFT JOIN instances i ON i.client_id = c.id
GROUP BY c.id, c.name, c.status, c.total_savings, c.last_sync_at;

-- View: Agent health summary
CREATE OR REPLACE VIEW v_agent_health_summary AS
SELECT 
    a.id,
    a.logical_agent_id,
    a.client_id,
    c.name as client_name,
    a.status,
    a.enabled,
    a.auto_switch_enabled,
    a.auto_terminate_enabled,
    a.last_heartbeat,
    a.instance_count,
    a.agent_version,
    a.hostname,
    a.retired_at,
    a.retirement_reason,
    TIMESTAMPDIFF(MINUTE, a.last_heartbeat, NOW()) as minutes_since_heartbeat,
    COUNT(DISTINCT CASE WHEN i.is_active = TRUE THEN i.id END) as active_instances,
    CASE 
        WHEN a.retired_at IS NOT NULL THEN 'retired'
        WHEN a.last_heartbeat IS NULL THEN 'never_connected'
        WHEN TIMESTAMPDIFF(MINUTE, a.last_heartbeat, NOW()) < 5 THEN 'healthy'
        WHEN TIMESTAMPDIFF(MINUTE, a.last_heartbeat, NOW()) < 10 THEN 'warning'
        ELSE 'critical'
    END as health_status
FROM agents a
JOIN clients c ON c.id = a.client_id
LEFT JOIN instances i ON i.agent_id = a.id
GROUP BY a.id, a.logical_agent_id, a.client_id, c.name, a.status, a.enabled,
         a.auto_switch_enabled, a.auto_terminate_enabled, a.last_heartbeat,
         a.instance_count, a.agent_version, a.hostname, a.retired_at, a.retirement_reason;

-- View: Switch events with detailed info
CREATE OR REPLACE VIEW v_switch_events_detailed AS
SELECT 
    se.*,
    c.name as client_name,
    a.logical_agent_id,
    i_old.instance_type as old_instance_type,
    i_new.instance_type as new_instance_type,
    CASE 
        WHEN se.execution_status = 'completed' AND se.old_instance_terminated = TRUE THEN 'complete_with_cleanup'
        WHEN se.execution_status = 'completed' AND se.old_instance_terminated = FALSE THEN 'complete_no_cleanup'
        WHEN se.execution_status = 'failed' THEN 'failed'
        ELSE 'unknown'
    END as detailed_status,
    (se.on_demand_price - COALESCE(se.new_spot_price, se.on_demand_price)) * 24 * 30 as estimated_monthly_savings
FROM switch_events se
LEFT JOIN clients c ON c.id = se.client_id
LEFT JOIN agents a ON a.id = se.agent_id
LEFT JOIN instances i_old ON i_old.id = se.old_instance_id
LEFT JOIN instances i_new ON i_new.id = se.new_instance_id;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default admin client for testing
INSERT INTO clients (id, name, status, client_token, total_savings)
VALUES ('client-admin', 'Admin Test Client', 'active', 'token-admin-test-12345', 0.0000);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT 'Schema created successfully!' as status;

SELECT 
    'Table Check' as verification_type,
    TABLE_NAME,
    TABLE_ROWS,
    ROUND(DATA_LENGTH / 1024 / 1024, 2) as DATA_MB
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'spot_optimizer'
ORDER BY TABLE_NAME;

SELECT 
    'Column Check - agents' as verification_type,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'spot_optimizer'
  AND TABLE_NAME = 'agents'
ORDER BY ORDINAL_POSITION;

SELECT 
    'Column Check - instances' as verification_type,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'spot_optimizer'
  AND TABLE_NAME = 'instances'
ORDER BY ORDINAL_POSITION;

SELECT 
    'Column Check - switch_events' as verification_type,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'spot_optimizer'
  AND TABLE_NAME = 'switch_events'
ORDER BY ORDINAL_POSITION;

-- ============================================================================
-- COMPATIBILITY VERIFICATION
-- ============================================================================

SELECT '=== COMPATIBILITY VERIFICATION ===' as check_section;

-- Check critical columns for backend v2.4.0
SELECT 
    'Backend v2.4.0 Compatibility' as check_type,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.COLUMNS 
              WHERE TABLE_SCHEMA='spot_optimizer' AND TABLE_NAME='agents' AND COLUMN_NAME='retired_at') = 1
        AND (SELECT COUNT(*) FROM information_schema.COLUMNS 
              WHERE TABLE_SCHEMA='spot_optimizer' AND TABLE_NAME='agents' AND COLUMN_NAME='logical_agent_id') = 1
        AND (SELECT COUNT(*) FROM information_schema.COLUMNS 
              WHERE TABLE_SCHEMA='spot_optimizer' AND TABLE_NAME='instances' AND COLUMN_NAME='detected_mode') = 1
        AND (SELECT COUNT(*) FROM information_schema.COLUMNS 
              WHERE TABLE_SCHEMA='spot_optimizer' AND TABLE_NAME='pending_switch_commands' AND COLUMN_NAME='priority') = 1
        AND (SELECT COUNT(*) FROM information_schema.COLUMNS 
              WHERE TABLE_SCHEMA='spot_optimizer' AND TABLE_NAME='switch_events' AND COLUMN_NAME='execution_status') = 1
        THEN '✓ PASS - All required columns present'
        ELSE '✗ FAIL - Missing required columns'
    END as status;

SELECT '=== SCHEMA SETUP COMPLETE ===' as final_status;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
