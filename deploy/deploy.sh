#!/bin/bash
# ============================================================
# VENUEPRO SAAS — Deployment Script
# Run this on the Oracle Cloud VM to deploy updates
# Usage: bash deploy/deploy.sh
# ============================================================
set -e

APP_DIR="/home/ubuntu/venuepro-saas"
BRANCH="main"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[✗]${NC} $1"; }

# Validate we're in the right directory
if [ ! -d "$APP_DIR" ]; then
  err "Application directory not found: $APP_DIR"
  err "Run setup.sh first, or update APP_DIR in this script"
  exit 1
fi

cd "$APP_DIR"

echo "============================================"
echo "  VenuePro SaaS — Deploying Updates"
echo "============================================"

# ─── 1. Pull latest code ─────────────────────────────────
echo -e "\n${YELLOW}─── 1. Pulling Latest Code ───${NC}"
git checkout "$BRANCH"
git pull origin "$BRANCH"
log "Code updated from $BRANCH branch"

# ─── 2. Install backend dependencies ─────────────────────
echo -e "\n${YELLOW}─── 2. Installing Backend Dependencies ───${NC}"
cd "$APP_DIR/server"
npm install
log "Backend dependencies installed"

# ─── 3. Install & build frontend ─────────────────────────
echo -e "\n${YELLOW}─── 3. Building Frontend ───${NC}"
cd "$APP_DIR/client"
npm install
npm run build
log "Frontend built successfully"

# ─── 4. Copy Nginx config (in case it changed) ──────────
echo -e "\n${YELLOW}─── 4. Updating Nginx Config ───${NC}"
sudo cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/venuepro
sudo nginx -t && sudo systemctl reload nginx
log "Nginx config reloaded"

# ─── 5. Restart PM2 ──────────────────────────────────────
echo -e "\n${YELLOW}─── 5. Restarting Application ───${NC}"
pm2 restart venuepro-api && pm2 save
log "PM2: venuepro-api restarted"

# ─── Done ─────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  DEPLOY COMPLETE ✅"
echo "============================================"
echo ""
echo "  Check status: pm2 status"
echo "  View logs:    pm2 logs venuepro-api"
echo "  Health:       curl http://localhost:5000/api/health"
echo ""
