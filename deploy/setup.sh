#!/bin/bash
# ============================================================
# VENUEPRO SAAS — DigitalOcean First-Time Setup
# Run this ONCE on a fresh Ubuntu 22.04/24.04 Droplet
# ============================================================
set -e

echo "============================================"
echo "  VenuePro SaaS — DigitalOcean Setup"
echo "============================================"

# ─── Configuration — EDIT THESE ───────────────────────────
REPO_URL="https://github.com/SarthakVaishampayan/VenuePro.git"
APP_DIR="/root/venuepro-saas"
DOMAIN="venuepro.live"  # Your domain
ADMIN_EMAIL="sarthakrocks2003@gmail.com"  # Your email (for SSL cert)
# ──────────────────────────────────────────────────────────

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[✗]${NC} $1"; }

# ─── 1. System Updates ────────────────────────────────────
echo -e "\n${YELLOW}─── 1. System Updates ───${NC}"
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget gnupg2 git ufw software-properties-common

# ─── 2. Install Node.js 22.x ──────────────────────────────
echo -e "\n${YELLOW}─── 2. Installing Node.js 22.x ───${NC}"
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v

# ─── 3. Install MongoDB 7.x ───────────────────────────────
echo -e "\n${YELLOW}─── 3. Installing MongoDB 7.x ───${NC}"
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Auto-detect Ubuntu codename (jammy for 22.04, noble for 24.04)
UBUNTU_CODENAME=$(lsb_release -cs 2>/dev/null || echo "jammy")
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${UBUNTU_CODENAME}/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl enable mongod
sudo systemctl start mongod
sleep 2
log "MongoDB status: $(sudo systemctl is-active mongod)"

# ─── 4. Install & Configure Nginx ─────────────────────────
echo -e "\n${YELLOW}─── 4. Installing Nginx ───${NC}"
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# ─── 5. Configure Firewall ────────────────────────────────
echo -e "\n${YELLOW}─── 5. Configuring Firewall ───${NC}"
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
log "Firewall enabled: SSH, Nginx Full"

# ─── 6. Install PM2 Globally ──────────────────────────────
echo -e "\n${YELLOW}─── 6. Installing PM2 ───${NC}"
sudo npm install -g pm2
pm2 startup systemd -u root --hp /root

# ─── 7. Clone Repository ─────────────────────────────────
echo -e "\n${YELLOW}─── 7. Cloning Repository ───${NC}"
mkdir -p /root
git clone "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"

# ─── 8. Prompt for Super Admin Credentials ────────────────
echo -e "\n${YELLOW}─── 8. Super Admin Credentials ───${NC}"

# Check if custom creds already exist in .env
if grep -q "^SUPER_ADMIN_EMAIL=" server/.env 2>/dev/null && [ "$(grep '^SUPER_ADMIN_EMAIL=' server/.env | cut -d= -f2)" != "admin@venuepro.com" ]; then
  ADMIN_EMAIL=$(grep '^SUPER_ADMIN_EMAIL=' server/.env | cut -d= -f2)
  ADMIN_NAME=$(grep '^SUPER_ADMIN_NAME=' server/.env | cut -d= -f2)
  ADMIN_PASS=$(grep '^SUPER_ADMIN_PASSWORD=' server/.env | cut -d= -f2)
  log "Using superadmin from .env: $ADMIN_NAME ($ADMIN_EMAIL)"
else
  echo ""
  echo "Set your superadmin credentials now."
  echo "These are the ONE-TIME credentials used to seed the database."
  echo "(Press Enter to accept the defaults: admin@venuepro.com / Admin@123)"
  echo ""
  read -p "Super Admin Name [Super Admin]: " input_name
  read -p "Super Admin Email [admin@venuepro.com]: " input_email
  read -s -p "Super Admin Password [Admin@123]: " input_pass
  echo ""

  ADMIN_NAME="${input_name:-Super Admin}"
  ADMIN_EMAIL="${input_email:-admin@venuepro.com}"
  ADMIN_PASS="${input_pass:-Admin@123}"
fi

# ─── 10. Create Production Environment File ───────────────
echo -e "\n${YELLOW}─── 10. Creating .env File ───${NC}"
if [ ! -f "server/.env" ]; then
  cat > server/.env << ENVEOF
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/sports_facility_saas

# Super Admin Credentials (used by seed.js)
SUPER_ADMIN_NAME=${ADMIN_NAME}
SUPER_ADMIN_EMAIL=${ADMIN_EMAIL}
SUPER_ADMIN_PASSWORD=${ADMIN_PASS}

# JWT Secrets — generate with: openssl rand -hex 32
JWT_SECRET=change-this-to-a-random-64-char-string
JWT_REFRESH_SECRET=change-this-to-another-random-64-char-string
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
APP_URL=https://venuepro.live
CORS_ORIGINS=https://venuepro.live
REQUEST_SIZE_LIMIT=10mb

# Mailjet (transactional emails)
MAILJET_API_KEY=your-mailjet-api-key
MAILJET_API_SECRET=your-mailjet-secret-key
FROM_EMAIL=your-verified-sender@email.com
FROM_NAME=VenuePro
ENVEOF
  warn ">>> EDIT server/.env with strong JWT secrets! <<<"
else
  log "server/.env already exists, skipping"
fi

# ─── 11. Install Dependencies & Build ────────────────────
echo -e "\n${YELLOW}─── 11. Installing Dependencies ───${NC}"
cd "$APP_DIR/server"
npm install
cd "$APP_DIR/client"
npm install
npm run build
log "Client build complete"

# ─── 12. Copy Nginx Config ───────────────────────────────
echo -e "\n${YELLOW}─── 12. Configuring Nginx ───${NC}"
sudo cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/venuepro
sudo ln -sf /etc/nginx/sites-available/venuepro /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
log "Nginx configured"

# ─── 13. Set Up SSL (if domain is provided) ──────────────
if [ -n "$DOMAIN" ] && [ -n "$ADMIN_EMAIL" ]; then
  echo -e "\n${YELLOW}─── 13. Setting Up SSL with Let's Encrypt ───${NC}"
  sudo apt install -y certbot python3-certbot-nginx
  sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$ADMIN_EMAIL"
  
  # Auto-renewal
  sudo systemctl enable certbot.timer
  sudo systemctl start certbot.timer
  log "SSL certificate installed & auto-renewal configured"
else
  warn "Skipping SSL — set DOMAIN and ADMIN_EMAIL for HTTPS"
fi

# ─── 14. Start Application with PM2 ─────────────────────
echo -e "\n${YELLOW}─── 14. Starting Application ───${NC}"
cd "$APP_DIR/server"
pm2 start server.js --name "venuepro-api" -i 1
pm2 save
log "PM2 started: venuepro-api"

# ─── 15. Seed Database ───────────────────────────────────
echo -e "\n${YELLOW}─── 15. Seeding Database ───${NC}"
cd "$APP_DIR/server"
npm run seed 2>/dev/null && log "Database seeded" || warn "Seed skipped (may already exist)"

# ─── Summary ──────────────────────────────────────────────
echo ""
echo "============================================"
echo "  SETUP COMPLETE ✅"
echo "============================================"
echo ""
echo "  Backend API:  http://$(curl -s ifconfig.me):5000"
echo "  Health Check: http://$(curl -s ifconfig.me)/api/health"
if [ -n "$DOMAIN" ]; then
  echo "  Domain:       https://$DOMAIN"
  echo "  API Docs:     https://$DOMAIN/api-docs"
fi
echo ""
echo "  Next steps:"
echo "  1. Edit server/.env with strong JWT secrets"
echo "  2. If using Vercel for frontend:"
echo "     - Deploy client/ to Vercel"
echo "     - Set VITE_API_URL=http://YOUR_DROPLET_IP:5000 in Vercel"
echo "  3. Run deploy/deploy.sh for future updates"
echo ""
