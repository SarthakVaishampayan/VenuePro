#!/bin/bash
# ============================================================
# VENUEPRO SAAS — Deployment Script
# Run this on the DigitalOcean Droplet to deploy updates
# Usage: bash deploy/deploy.sh
# ============================================================
set -e

APP_DIR="/root/venuepro-saas"
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

# ─── 4. Run API Sanity Check ─────────────────────────
echo -e "\n${YELLOW}─── 4. Running API Sanity Check ───${NC}"
cd "$APP_DIR"
if node deploy/sanity-check.mjs check; then
  log "Sanity check passed — route structure is consistent"
else
  SANITY_EXIT=$?
  if [ "$SANITY_EXIT" -eq 1 ]; then
    warn "⚠ BREAKING CHANGES DETECTED: Routes were removed or modified!"
    warn "   Review the report above carefully before proceeding."
    warn "   To force deploy anyway: bash deploy/deploy.sh --force"
    if [ "$1" != "--force" ]; then
      err "Deploy aborted. Run with --force to override."
      exit 1
    fi
    log "--force flag detected, continuing despite breaking changes..."
  else
    warn "Sanity check encountered an issue (exit code $SANITY_EXIT)"
    warn "   Continuing with deploy..."
  fi
fi

# ─── 5. Copy Nginx config (in case it changed) ──────────
echo -e "\n${YELLOW}─── 5. Updating Nginx Config ───${NC}"
sudo cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/venuepro
sudo nginx -t && sudo systemctl reload nginx
log "Nginx config reloaded"

# ─── 6. Restart PM2 ──────────────────────────────────────
echo -e "\n${YELLOW}─── 6. Restarting Application ───${NC}"
pm2 restart venuepro-api && pm2 save

# ─── 7. Post-Deploy Smoke Test ───────────────────────────
echo -e "\n${YELLOW}─── 7. Running Post-Deploy Smoke Test ───${NC}"

SMOKE_FAILED=0

# Wait for server to start — poll health endpoint with retry (up to ~20s)
echo -n "     Waiting for server to start..."
STARTED=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health 2>/dev/null || echo "000")
  if [ "$HEALTH" = "200" ]; then
    echo " up! ($((i * 2))s)"
    STARTED=1
    break
  fi
  sleep 2
done

if [ "$STARTED" -eq 1 ]; then
  log "Health check: /api/health → 200 ✓"
else
  warn "Health check: Server did not respond within 20 seconds"
  SMOKE_FAILED=1
fi

# Public endpoint — verify Express + MongoDB are working
PUBLIC_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/public/business-types 2>/dev/null || echo "000")
if [ "$PUBLIC_CHECK" = "200" ]; then
  log "Route check: GET /api/public/business-types → 200 ✓ (Express + MongoDB)"
else
  warn "Route check: GET /api/public/business-types → $PUBLIC_CHECK (expected 200)"
  SMOKE_FAILED=1
fi

if [ "$SMOKE_FAILED" -eq 1 ]; then
  warn "⚠ Some post-deploy checks failed. Review the logs above."
  warn "   Deployment completed, but the application may have issues."
  warn "   Run 'pm2 logs venuepro-api' to troubleshoot."
  warn "   Rollback: pm2 restart venuepro-api && git reset --hard HEAD~1"
else
  log "All post-deploy smoke tests passed ✓"
fi

# ─── Done ─────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  DEPLOY COMPLETE ✅"
echo "============================================"
echo ""
echo "  Check status: pm2 status"
echo "  View logs:    pm2 logs venuepro-api"
echo "  Health:       curl http://localhost:5000/api/health"
echo "  Routes:       node deploy/sanity-check.mjs compare"
echo ""
