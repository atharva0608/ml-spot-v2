#!/bin/bash

set -e

echo "=================================="
echo "Spot Optimizer Deployment Fix"
echo "=================================="
echo ""

# Configuration
REPO_DIR="/home/ubuntu/ml-spot-v2"
DEPLOY_DIR="/home/ubuntu/ml-spot-optimizer"
BACKEND_DIR="$DEPLOY_DIR/backend"
FRONTEND_DIR="$DEPLOY_DIR/frontend"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# 1. Stop the backend service
echo ""
echo "1. Stopping backend service..."
sudo systemctl stop spot-optimizer-backend || log_warn "Service was not running"
log_info "Backend service stopped"

# 2. Pull latest code from repository
echo ""
echo "2. Pulling latest code from repository..."
cd "$REPO_DIR"
git fetch origin
git checkout claude/admin-dashboard-structure-01LeQpEhA3tF3VSM5iKMuD9U
git pull origin claude/admin-dashboard-structure-01LeQpEhA3tF3VSM5iKMuD9U
log_info "Latest code pulled"

# 3. Copy backend.py to correct location
echo ""
echo "3. Copying backend.py to deployment directory..."
mkdir -p "$BACKEND_DIR"
cp -f "$REPO_DIR/backend.py" "$BACKEND_DIR/"
log_info "backend.py copied to $BACKEND_DIR/"

# 4. Ensure .env file exists
echo ""
echo "4. Checking .env configuration..."
if [ ! -f "$BACKEND_DIR/.env" ]; then
    log_warn ".env file not found, creating from environment..."

    # Get instance metadata
    TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
    INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
    REGION=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/region)

    cat > "$BACKEND_DIR/.env" <<EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=spotuser
DB_PASSWORD=SpotUser2024!
DB_NAME=spot_optimizer
DB_POOL_SIZE=15

# AWS Configuration
REGION=$REGION
INSTANCE_ID=$INSTANCE_ID

# Decision Engine
DECISION_ENGINE_TYPE=hybrid
MODEL_DIR=/home/ubuntu/ml-spot-optimizer/models

# Server Configuration
PORT=5000
FLASK_ENV=production
EOF
    log_info ".env file created"
else
    log_info ".env file exists"
fi

# 5. Create/update start script with proper environment handling
echo ""
echo "5. Creating start_backend.sh script..."
cat > "$BACKEND_DIR/start_backend.sh" <<'EOF'
#!/bin/bash

# Change to backend directory
cd /home/ubuntu/ml-spot-optimizer/backend

# Activate virtual environment
source /home/ubuntu/ml-spot-optimizer/venv/bin/activate

# Load environment variables from .env file
if [ -f .env ]; then
    # Export all variables from .env file
    set -a
    source .env
    set +a
    echo "Environment variables loaded from .env"
else
    echo "Warning: .env file not found"
fi

# Log environment for debugging (without sensitive values)
echo "Starting Spot Optimizer Backend"
echo "Region: $REGION"
echo "Instance ID: $INSTANCE_ID"
echo "Decision Engine: $DECISION_ENGINE_TYPE"
echo "Model Directory: $MODEL_DIR"

# Start gunicorn
exec gunicorn \
    --bind 127.0.0.1:5000 \
    --workers 4 \
    --threads 2 \
    --worker-class gthread \
    --timeout 120 \
    --access-logfile /var/log/spot-optimizer/access.log \
    --error-logfile /var/log/spot-optimizer/error.log \
    --log-level info \
    backend:app
EOF

chmod +x "$BACKEND_DIR/start_backend.sh"
log_info "start_backend.sh created"

# 6. Update systemd service file
echo ""
echo "6. Updating systemd service file..."
sudo tee /etc/systemd/system/spot-optimizer-backend.service > /dev/null <<EOF
[Unit]
Description=Spot Optimizer Backend Service
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/ml-spot-optimizer/backend
ExecStart=/home/ubuntu/ml-spot-optimizer/backend/start_backend.sh
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=spot-optimizer

# Environment
Environment="PATH=/home/ubuntu/ml-spot-optimizer/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

[Install]
WantedBy=multi-user.target
EOF

log_info "Systemd service file updated"

# 7. Ensure virtual environment exists and dependencies are installed
echo ""
echo "7. Checking Python virtual environment..."
if [ ! -d "/home/ubuntu/ml-spot-optimizer/venv" ]; then
    log_warn "Virtual environment not found, creating..."
    python3 -m venv /home/ubuntu/ml-spot-optimizer/venv
    log_info "Virtual environment created"
fi

# Install/update dependencies
log_info "Installing/updating Python dependencies..."
source /home/ubuntu/ml-spot-optimizer/venv/bin/activate
pip install --upgrade pip > /dev/null 2>&1
pip install flask==3.0.0 flask-cors gunicorn pymysql boto3 python-dotenv > /dev/null 2>&1
deactivate
log_info "Dependencies installed"

# 8. Ensure log directory exists
echo ""
echo "8. Setting up log directory..."
sudo mkdir -p /var/log/spot-optimizer
sudo chown ubuntu:ubuntu /var/log/spot-optimizer
log_info "Log directory ready"

# 9. Ensure models directory exists
echo ""
echo "9. Setting up models directory..."
mkdir -p /home/ubuntu/ml-spot-optimizer/models
log_info "Models directory ready"

# 10. Test backend configuration
echo ""
echo "10. Testing backend configuration..."
cd "$BACKEND_DIR"
source /home/ubuntu/ml-spot-optimizer/venv/bin/activate

# Load .env and test
set -a
source .env
set +a

# Quick syntax check
python3 -c "import backend" 2>/dev/null
if [ $? -eq 0 ]; then
    log_info "Backend syntax check passed"
else
    log_error "Backend syntax check failed - check for Python errors"
fi

deactivate

# 11. Check MySQL container
echo ""
echo "11. Checking MySQL container..."
if docker ps | grep -q spot-mysql; then
    log_info "MySQL container is running"
else
    log_error "MySQL container is not running!"
    echo "Start it with:"
    echo "docker start spot-mysql"
    echo "Or create it with the provided commands in the deployment guide"
fi

# 12. Reload systemd and start service
echo ""
echo "12. Starting backend service..."
sudo systemctl daemon-reload
sudo systemctl enable spot-optimizer-backend
sudo systemctl start spot-optimizer-backend

# Wait a moment for startup
sleep 3

# 13. Check service status
echo ""
echo "13. Checking service status..."
if sudo systemctl is-active --quiet spot-optimizer-backend; then
    log_info "Backend service is running!"
else
    log_error "Backend service failed to start"
    echo ""
    echo "Check logs with:"
    echo "  sudo journalctl -u spot-optimizer-backend -n 50 --no-pager"
    echo "  tail -n 50 /var/log/spot-optimizer/error.log"
    exit 1
fi

# 14. Test health endpoint
echo ""
echo "14. Testing health endpoint..."
sleep 2
HEALTH_RESPONSE=$(curl -s http://localhost:5000/health)
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    log_info "Health check passed!"
    echo ""
    echo "Response:"
    echo "$HEALTH_RESPONSE" | python3 -m json.tool
else
    log_error "Health check failed"
    echo "Response: $HEALTH_RESPONSE"
fi

# 15. Final status summary
echo ""
echo "=================================="
echo "Deployment Fix Complete!"
echo "=================================="
echo ""
echo "Service Status:"
sudo systemctl status spot-optimizer-backend --no-pager -l | head -n 10
echo ""
echo "Useful Commands:"
echo "  Status:  sudo systemctl status spot-optimizer-backend"
echo "  Logs:    sudo journalctl -u spot-optimizer-backend -f"
echo "  Restart: sudo systemctl restart spot-optimizer-backend"
echo "  Stop:    sudo systemctl stop spot-optimizer-backend"
echo ""
echo "Health Check: curl http://localhost:5000/health | python3 -m json.tool"
echo ""
