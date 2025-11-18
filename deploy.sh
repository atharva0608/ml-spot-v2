#!/bin/bash
# ==============================================================================
# AWS Spot Optimizer - Complete EC2 Setup Script v3.0.0
# ==============================================================================
# Updated for Admin Dashboard with enhanced schema and backend
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# Configuration
GITHUB_REPO="https://github.com/atharva0608/ml-spot-v2.git"
APP_DIR="/home/ubuntu/ml-spot-optimizer"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
MODELS_DIR="/home/ubuntu/production_models"
LOGS_DIR="/home/ubuntu/logs"
SCRIPTS_DIR="/home/ubuntu/scripts"

DB_ROOT_PASSWORD="SpotOptimizer2024!"
DB_USER="spotuser"
DB_PASSWORD="SpotUser2024!"
DB_NAME="spot_optimizer"
DB_PORT=3306

BACKEND_PORT=5000
BACKEND_HOST="0.0.0.0"

NGINX_ROOT="/var/www/spot-optimizer"

log "Starting AWS Spot Optimizer Setup v3.0.0..."

# Get instance metadata
log "Retrieving instance metadata..."
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" 2>/dev/null || echo "")

if [ -n "$TOKEN" ]; then
    PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "")
    INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null || echo "unknown")
    REGION=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/region 2>/dev/null || echo "ap-south-1")
else
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "UNKNOWN")
    INSTANCE_ID="unknown"
    REGION="ap-south-1"
fi

log "Instance ID: $INSTANCE_ID"
log "Region: $REGION"
log "Public IP: $PUBLIC_IP"

# Update system
log "Updating system..."
sudo apt-get update -y
sudo apt-get install -y curl wget git unzip software-properties-common apt-transport-https \
    ca-certificates gnupg lsb-release build-essential python3 python3-pip python3-venv nginx jq

# Install Docker
log "Installing Docker..."
sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu

log "Docker installed"

# Install Node.js LTS
log "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
log "Node.js $(node --version) installed"

# Create directories
log "Creating directory structure..."
sudo mkdir -p "$APP_DIR" "$BACKEND_DIR" "$FRONTEND_DIR" "$MODELS_DIR" "$LOGS_DIR" "$SCRIPTS_DIR" "$NGINX_ROOT"
sudo chown -R ubuntu:ubuntu /home/ubuntu/
sudo chown -R www-data:www-data "$NGINX_ROOT"

# Clone repository
log "Cloning repository..."
if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    git pull origin main || git pull origin master || true
else
    sudo rm -rf "$APP_DIR"
    git clone "$GITHUB_REPO" "$APP_DIR"
fi
cd "$APP_DIR"

# Setup MySQL with Docker
log "Setting up MySQL..."
docker stop spot-mysql 2>/dev/null || true
docker rm spot-mysql 2>/dev/null || true
docker network create spot-network 2>/dev/null || true

docker run -d \
    --name spot-mysql \
    --network spot-network \
    --restart unless-stopped \
    -e MYSQL_ROOT_PASSWORD="$DB_ROOT_PASSWORD" \
    -e MYSQL_DATABASE="$DB_NAME" \
    -e MYSQL_USER="$DB_USER" \
    -e MYSQL_PASSWORD="$DB_PASSWORD" \
    -p "$DB_PORT:3306" \
    -v /home/ubuntu/mysql-data:/var/lib/mysql \
    mysql:8.0 \
    --default-authentication-plugin=mysql_native_password \
    --character-set-server=utf8mb4 \
    --collation-server=utf8mb4_unicode_ci \
    --max_connections=200

log "Waiting for MySQL to initialize..."
sleep 15

MAX_ATTEMPTS=30
ATTEMPT=0
while ! docker exec spot-mysql mysqladmin ping -h "localhost" --silent 2>/dev/null; do
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
        error "MySQL failed to start"
        docker logs spot-mysql
        exit 1
    fi
    sleep 2
done

log "Waiting for MySQL auth..."
ATTEMPT=0
while ! docker exec spot-mysql mysql -u root -p"$DB_ROOT_PASSWORD" -e "SELECT 1;" > /dev/null 2>&1; do
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
        error "MySQL auth failed"
        exit 1
    fi
    sleep 2
done

log "MySQL ready!"

# Import schema
log "Importing database schema..."
if [ -f "$APP_DIR/schema.sql" ]; then
    docker exec -i spot-mysql mysql -u root -p"$DB_ROOT_PASSWORD" < "$APP_DIR/schema.sql" 2>&1 | grep -v "Warning" || true
    log "Schema imported successfully"
else
    error "schema.sql not found!"
    exit 1
fi

# Setup Python backend
log "Setting up Python backend..."
mkdir -p "$BACKEND_DIR"
cd "$BACKEND_DIR"

python3 -m venv venv
source venv/bin/activate

if [ -f "$APP_DIR/backend.py" ]; then
    cp "$APP_DIR/backend.py" "$BACKEND_DIR/"
else
    error "backend.py not found!"
    exit 1
fi

if [ -f "$APP_DIR/decision_engine.py" ]; then
    cp "$APP_DIR/decision_engine.py" "$BACKEND_DIR/"
fi

cat > requirements.txt << 'EOF'
Flask==3.0.0
flask-cors==4.0.0
mysql-connector-python==8.2.0
APScheduler==3.10.4
marshmallow==3.20.1
numpy>=1.26.0
scikit-learn>=1.3.0
gunicorn==21.2.0
python-dotenv==1.0.0
pandas>=2.0.0
EOF

pip install --upgrade pip setuptools wheel > /dev/null 2>&1
pip install -r requirements.txt

cat > .env << EOF
DB_HOST=127.0.0.1
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
DB_POOL_SIZE=15
DECISION_ENGINE_TYPE=hybrid
MODEL_DIR=$MODELS_DIR
AWS_REGION=$REGION
HOST=$BACKEND_HOST
PORT=$BACKEND_PORT
DEBUG=False
EOF

cat > start_backend.sh << 'EOF'
#!/bin/bash
cd /home/ubuntu/ml-spot-optimizer/backend
source venv/bin/activate
export $(grep -v '^#' .env | xargs)
exec gunicorn \
    --bind 0.0.0.0:5000 \
    --workers 4 \
    --threads 2 \
    --worker-class gthread \
    --timeout 120 \
    --access-logfile /home/ubuntu/logs/backend_access.log \
    --error-logfile /home/ubuntu/logs/backend_error.log \
    --capture-output \
    --log-level info \
    backend:app
EOF

chmod +x start_backend.sh
deactivate

log "Backend setup complete"

# Setup React frontend
log "Setting up React frontend..."
mkdir -p "$FRONTEND_DIR"
cd "$FRONTEND_DIR"

cat > package.json << 'EOF'
{
  "name": "spot-optimizer-dashboard",
  "version": "3.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.10.0",
    "lucide-react": "^0.263.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  },
  "devDependencies": {
    "react-scripts": "5.0.1",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  },
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": ["last 1 chrome version"]
  }
}
EOF

mkdir -p public src

cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Spot Optimizer Admin Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
EOF

cat > src/index.js << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
EOF

if [ -f "$APP_DIR/App.jsx" ]; then
    cp "$APP_DIR/App.jsx" "$FRONTEND_DIR/src/"
    sed -i "s|BASE_URL: 'http://localhost:5000'|BASE_URL: 'http://$PUBLIC_IP:5000'|g" "$FRONTEND_DIR/src/App.jsx"
    log "Updated API URL to http://$PUBLIC_IP:5000"
else
    error "App.jsx not found!"
    exit 1
fi

npm install
npm run build

sudo rm -rf "$NGINX_ROOT"/*
sudo cp -r build/* "$NGINX_ROOT/"
sudo chown -R www-data:www-data "$NGINX_ROOT"

log "Frontend deployed"

# Configure Nginx
log "Configuring Nginx..."
sudo mv /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup 2>/dev/null || true

sudo tee /etc/nginx/sites-available/spot-optimizer << EOF
server {
    listen 80 default_server;
    server_name _;
    root $NGINX_ROOT;
    index index.html;
    
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;
    
    location / {
        try_files \$uri \$uri/ /index.html;
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_read_timeout 120s;
    }
    
    location /health {
        proxy_pass http://127.0.0.1:$BACKEND_PORT/health;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/spot-optimizer /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

log "Nginx configured"

# Create systemd service
log "Creating systemd service..."
sudo tee /etc/systemd/system/spot-optimizer-backend.service << EOF
[Unit]
Description=AWS Spot Optimizer Backend
After=network.target docker.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$BACKEND_DIR
ExecStart=$BACKEND_DIR/start_backend.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable spot-optimizer-backend
sudo systemctl start spot-optimizer-backend

log "Backend service started"

# Create helper scripts
log "Creating helper scripts..."

cat > "$SCRIPTS_DIR/status.sh" << 'SCRIPT_EOF'
#!/bin/bash
echo "==================================="
echo "Spot Optimizer Service Status"
echo "==================================="

TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 300" 2>/dev/null)
if [ -n "$TOKEN" ]; then
    PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null)
else
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null)
fi

echo "Public IP: $PUBLIC_IP"
echo ""
echo "MySQL: $(docker ps | grep -q spot-mysql && echo '✓ Running' || echo '✗ Not Running')"
echo "Backend: $(systemctl is-active spot-optimizer-backend)"
echo "Nginx: $(systemctl is-active nginx)"
echo ""
echo "URLs:"
echo "  Dashboard: http://$PUBLIC_IP/"
echo "  API Health: http://$PUBLIC_IP/health"
SCRIPT_EOF

cat > "$SCRIPTS_DIR/restart.sh" << 'SCRIPT_EOF'
#!/bin/bash
echo "Restarting services..."
docker restart spot-mysql
sleep 5
sudo systemctl restart spot-optimizer-backend
sudo systemctl restart nginx
echo "Done!"
SCRIPT_EOF

cat > "$SCRIPTS_DIR/logs.sh" << 'SCRIPT_EOF'
#!/bin/bash
echo "1) Backend (systemd)"
echo "2) Backend access log"
echo "3) Backend error log"
echo "4) Nginx access"
echo "5) Nginx error"
echo "6) MySQL"
read -p "Choice [1-6]: " choice

case $choice in
    1) sudo journalctl -u spot-optimizer-backend -f ;;
    2) tail -f /home/ubuntu/logs/backend_access.log ;;
    3) tail -f /home/ubuntu/logs/backend_error.log ;;
    4) sudo tail -f /var/log/nginx/access.log ;;
    5) sudo tail -f /var/log/nginx/error.log ;;
    6) docker logs -f spot-mysql ;;
esac
SCRIPT_EOF

chmod +x "$SCRIPTS_DIR"/*.sh

log "Helper scripts created"

# Create completion summary
cat > /home/ubuntu/SETUP_COMPLETE.txt << EOF
================================================================================
AWS SPOT OPTIMIZER - ADMIN DASHBOARD v3.0.0 - SETUP COMPLETE
================================================================================

Date: $(date)
Instance ID: $INSTANCE_ID
Region: $REGION
Public IP: $PUBLIC_IP

================================================================================
ACCESS URLS
================================================================================
Admin Dashboard: http://$PUBLIC_IP/
Backend API Health: http://$PUBLIC_IP/health

================================================================================
COMPONENTS
================================================================================
✓ MySQL 8.0 with enhanced schema v3.0.0
✓ Python Backend v3.0.0 with comprehensive admin APIs
✓ React Admin Dashboard v3.0.0 with full feature set
✓ Nginx reverse proxy
✓ Systemd service for backend

================================================================================
FEATURES INCLUDED
================================================================================
✓ Global admin dashboard with stats
✓ Client management (add, delete, view)
✓ Agent management (configure, enable/disable, auto-switch, auto-terminate)
✓ Instance management with pool switching
✓ Switch history with filters and export
✓ Savings analytics and graphs
✓ Live agent data monitoring
✓ System health monitoring
✓ Decision engine status

================================================================================
DATABASE
================================================================================
Host: 127.0.0.1
Port: $DB_PORT
Database: $DB_NAME
User: $DB_USER
Password: $DB_PASSWORD

================================================================================
HELPER SCRIPTS
================================================================================
~/scripts/status.sh    - Check service status
~/scripts/restart.sh   - Restart all services
~/scripts/logs.sh      - View logs

================================================================================
NEXT STEPS
================================================================================
1. Access dashboard at http://$PUBLIC_IP/
2. Default client token: token-admin-test-12345
3. Upload production models to $MODELS_DIR
4. Configure security groups to allow port 80

================================================================================
EOF

cat /home/ubuntu/SETUP_COMPLETE.txt

log "============================================"
log "SETUP COMPLETE!"
log "============================================"
log "Dashboard URL: http://$PUBLIC_IP/"
log "View details: cat ~/SETUP_COMPLETE.txt"
log "Check status: ~/scripts/status.sh"
log "============================================"
