# 🚀 VenuePro SaaS — DigitalOcean Deployment Guide

> **Architecture:** Backend + MongoDB on DigitalOcean Droplet · Frontend on **Vercel** (free CDN)
> **DigitalOcean Droplet Specs:** 1 vCPU · 1GB RAM · 25GB SSD — **always-on, no spin-down**
> **Cost:** **$0 for ~33 months** using GitHub Student Pack $200 credit

---

## 📋 Prerequisites

Before starting, you need:

| Item | Where to get it |
|------|----------------|
| **GitHub Student Developer Pack** | [education.github.com/pack](https://education.github.com/pack) — already active ✅ |
| **DigitalOcean account** | [digitalocean.com](https://digitalocean.com) — sign up via GitHub Student Pack to **get $200 credit** |
| **GitHub repository** | Push your code to GitHub: `saas-platform/` as the root |
| **Vercel account** | [vercel.com](https://vercel.com) — sign up with GitHub (free) |
| **Domain (optional)** | Any domain registrar — needed for HTTPS |

---

## 🗺️ Architecture Overview

```
                    ┌──────────────────────────────┐
                    │        Vercel (CDN)           │
                    │   Frontend: React/Vite         │
                    │   https://venuepro.vercel.app  │
                    └──────────┬───────────────────┘
                               │ API calls to Droplet IP
                               ▼
┌──────────────────────────────────────────────────────┐
│           DigitalOcean Droplet (Ubuntu 22.04)         │
│                                                       │
│   Nginx (port 80/443)  ←  reverse proxy              │
│       │                                              │
│       ├── /api/*  →  Node.js (PM2, port 5000)        │
│       │                   └── Express server          │
│       │                                              │
│       └── /       →  Static files (client/dist)      │
│                                                       │
│   MongoDB (port 27017)  ←  local database            │
│                                                       │
│   PM2 manages Node.js process (auto-restart)          │
└──────────────────────────────────────────────────────┘
```

**Two options for frontend:**
1. **Vercel** (recommended) — Free, global CDN, instant loads
2. **Same Droplet via Nginx** — Simpler, one domain, but no CDN

---

## Step 1: Set Up DigitalOcean Droplet

### 1.1 — Claim Your $200 Credit

1. Go to [education.github.com/pack](https://education.github.com/pack)
2. Find the **DigitalOcean** card and click **"Get access"**
3. You'll be redirected to DigitalOcean — sign up with GitHub
4. The **$200 credit** is applied automatically to your account
5. No upfront payment needed — just add a debit card for identity verification (won't be charged until credit runs out)

> ⚠️ **Add a billing alert:** Go to **Billing → Alerts** and set an alert at $150 so you know when to renew or upgrade.

### 1.2 — Create a Droplet

1. Log into [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. Click **Create → Droplets**
3. Configure:
   - **Region:** Choose the one closest to you (e.g., Bangalore for India, Singapore for SE Asia)
   - **Image:** Ubuntu 22.04 LTS
   - **Size:** **Basic → Regular → $6/month** (1 vCPU, 1GB RAM, 25GB SSD)
     - *Your $200 credit covers this for ~33 months*
   - **Authentication:** SSH Key (recommended) or Password
     - If using SSH: Click **New SSH Key** → paste your public key (`~/.ssh/id_rsa.pub`)
     - *Don't have an SSH key?* Run `ssh-keygen -t ed25519 -C "your@email.com"` then `cat ~/.ssh/id_rsa.pub`
   - **Backups:** Optional (costs extra 20%, skip if you want to save credits)
   - **Hostname:** `venuepro-saas`
4. Click **Create Droplet** → wait ~1 minute

### 1.3 — Connect to Your Droplet

```bash
# If using SSH key:
ssh root@<YOUR_DROPLET_IP>

# If using password, you'll get the root password via email
```

> Your Droplet's IP is shown in the DigitalOcean dashboard. Note it down.

### 1.4 — Configure Firewall (Cloud Firewall)

DigitalOcean has a **cloud firewall** you can apply:

1. Go to **Networking → Firewalls → Create Firewall**
2. Add Inbound Rules:

| Source | Protocol | Port | Description |
|--------|----------|------|-------------|
| `0.0.0.0/0` | TCP | `22` | SSH |
| `0.0.0.0/0` | TCP | `80` | HTTP |
| `0.0.0.0/0` | TCP | `443` | HTTPS |

3. Click **Add Droplets** → select your `venuepro-saas` droplet
4. Click **Create Firewall**

> Alternatively, you can use UFW on the droplet itself (the setup script does this automatically).

---

## Step 2: Push Your Code to GitHub

On your local machine:

```bash
cd "E:/Project/Multi Tenat SaaS for sporting facilty/saas-platform"

# Initialize Git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit — VenuePro SaaS"

# Create repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/venuepro-saas.git
git branch -M main
git push -u origin main
```

---

## Step 3: Run Setup on DigitalOcean Droplet

SSH into your Droplet, then:

```bash
# 1. Edit the setup script with your repo URL
nano deploy/setup.sh
# → Change REPO_URL to your GitHub repo URL
# → Optionally set DOMAIN and ADMIN_EMAIL for HTTPS

# 2. Make it executable and run
chmod +x deploy/setup.sh
bash deploy/setup.sh
```

> **Note:** You don't need `sudo` for the setup script since you're already logged in as root on DigitalOcean.

### 🔐 Custom Super Admin Credentials

During setup, the script will **prompt you** for your superadmin credentials:

```
Super Admin Name [Super Admin]: Sid
Super Admin Email [admin@venuepro.com]: admin@myvenue.com
Super Admin Password [Admin@123]:
```

> **Important:** This is your ONE superadmin account. It grants full access to the platform.
> After setting these, you login as superadmin → create business owners → owners manage their venues.
> Players can self-signup through the player portal.

You can also **preset these** before deployment by editing `deploy/.env.production.example`:

```bash
# Copy the template first, then edit:
cp deploy/.env.production.example deploy/.env.production

# In deploy/.env.production, change:
SUPER_ADMIN_NAME=Sid
SUPER_ADMIN_EMAIL=admin@myvenue.com
SUPER_ADMIN_PASSWORD=MySecurePass123!
```

> ⚠️ `deploy/.env.production` is in `.gitignore` — your credentials stay local.
> Only `deploy/.env.production.example` (the template) gets committed.

**What the setup does automatically:**
- Installs Node.js 22, MongoDB 7, Nginx, PM2
- Clones your repo
- Prompts for (or reads) custom superadmin credentials
- Installs dependencies & builds the frontend
- Configures Nginx as a reverse proxy
- Starts the server with PM2
- Seeds the database **with your custom superadmin**

**After setup completes:** Edit the JWT secrets:

```bash
nano server/.env
# Generate strong secrets:
#   openssl rand -hex 32
# Update JWT_SECRET and JWT_REFRESH_SECRET
# Update CORS_ORIGINS with your Vercel domain

# Then restart:
pm2 restart venuepro-api
```

---

## Step 4: Set Up SSL (HTTPS)

**Option A: With a domain**

```bash
# On the Droplet, run:
sudo certbot --nginx -d yourdomain.com --non-interactive --agree-tos -m admin@yourdomain.com
```

Then update `deploy/nginx.conf` to uncomment the HTTPS server block.

**Option B: Without a domain (IP only)**

HTTPS won't work with a bare IP. Two alternatives:
1. Use **Cloudflare** to proxy your IP → get free SSL
2. Or just use HTTP for now (works fine for testing)

---

## Step 5: Deploy Frontend to Vercel

This is optional — you can also serve the frontend from the Droplet via Nginx. But Vercel is faster.

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo (`venuepro-saas`)
3. Configure:
   - **Root Directory:** `saas-platform/client`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add Environment Variables:
   - `VITE_API_URL=http://<YOUR_DROPLET_IP>` (or `https://yourdomain.com`)
5. Click **Deploy**

⚠️ **Important:** Update `CORS_ORIGINS` in `server/.env` on your Droplet to include your Vercel domain.

---

## Step 6: Verify Everything Works

```bash
# On the Droplet — check services
pm2 status
sudo systemctl status nginx
sudo systemctl status mongod

# Health check
curl http://localhost:5000/api/health

# From your browser
http://YOUR_DROPLET_IP/api/health
http://YOUR_DROPLET_IP/api-docs
```

### Test login:
```
URL: http://YOUR_DROPLET_IP
Email: (the email you set during setup)
Password: (the password you set during setup)
```

---

## 📦 Deploying Updates

Whenever you push new code to GitHub:

```bash
# SSH into the Droplet
ssh root@YOUR_DROPLET_IP

# Run the deploy script
bash /root/venuepro-saas/deploy/deploy.sh
```

That's it. The script pulls the latest code, rebuilds, and restarts.

---

## 🔧 Useful Commands

```bash
# View logs
pm2 logs venuepro-api          # Real-time logs
pm2 logs venuepro-api --lines 100  # Last 100 lines

# Monitor processes
pm2 monit                       # CPU/RAM dashboard

# Restart
pm2 restart venuepro-api

# MongoDB
mongosh                         # Open MongoDB shell
use sports_facility_saas        # Switch to our DB
db.ownerusers.find()            # List owners

# Update the deploy script (if changed)
cd ~/venuepro-saas
git pull
```

---

## 🛟 Troubleshooting

| Problem | Solution |
|---------|----------|
| `Connection refused` on port 22 | Check DigitalOcean Cloud Firewall — SSH rule must exist |
| `502 Bad Gateway` from Nginx | Node server isn't running: `pm2 start venuepro-api` |
| `MongoDB connection error` | Check: `sudo systemctl status mongod` |
| `CORS error` in browser | Update `CORS_ORIGINS` in `server/.env` |
| Port 80 not opening | Check DigitalOcean Cloud Firewall + `sudo ufw status` on Droplet |
| App returning HTML instead of JSON | Nginx not proxying `/api/` correctly — check nginx.conf |

---

## 💰 Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| DigitalOcean Droplet | **$0 for 33 months** | $6/mo droplet covered by $200 Student Pack credit |
| MongoDB | **Free** | Runs on the same Droplet |
| Vercel (frontend) | **Free** | 100GB bandwidth/month |
| Domain (optional) | ~$10/year | e.g., GoDaddy, Namecheap — or free `.me` domain via Student Pack! |
| SSL certificate | **Free** | Let's Encrypt (auto-renewed) |

**Total: $0 for ~33 months** (then $6/month — or switch providers)

> 💡 **Tip:** Before the $200 credit expires, check if you're eligible to renew your GitHub Student Pack or switch to another free tier.

---

> **Last updated:** May 27, 2026 · Questions? Ask Buffy!
