# 🚀 VenuePro SaaS — Oracle Cloud Deployment Guide

> **Architecture:** Backend + MongoDB on Oracle Cloud VM · Frontend on **Vercel** (free CDN)
> **Oracle Free Tier Specs:** 4 ARM CPU cores · 24GB RAM · 200GB storage — **always-on, no spin-down**

---

## 📋 Prerequisites

Before starting, you need:

| Item | Where to get it |
|------|----------------|
| **Oracle Cloud account** | [cloud.oracle.com](https://cloud.oracle.com) — sign up with debit card (free tier) |
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
                               │ API calls to Oracle IP
                               ▼
┌──────────────────────────────────────────────────────┐
│              Oracle Cloud VM (Ubuntu 22.04)           │
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
2. **Same VM via Nginx** — Simpler, one domain, but no CDN

---

## Step 1: Set Up Oracle Cloud VM

### 1.1 — Create a VM Instance

1. Log into [cloud.oracle.com](https://cloud.oracle.com)
2. Go to **Compute → Instances → Create Instance**
3. Configure:
   - **Name:** `venuepro-saas`
   - **Image:** Canonical Ubuntu 22.04 (or 24.04)
   - **Shape:** VM.Standard.A1.Flex (ARM)
     - **OCPUs:** 4
     - **Memory:** 24 GB
   - **SSH Key:** Download or generate a key pair (save the `.pem` file!)
   - **Boot volume:** 100 GB (free)
4. Click **Create** and wait ~2 minutes

### 1.2 — Connect to Your VM

```bash
# On your local machine (PowerShell/Terminal):
chmod 400 ~/Downloads/your-key.pem
ssh -i ~/Downloads/your-key.pem ubuntu@<YOUR_VM_IP>
```

> Your VM's IP is shown in the Oracle Cloud console. Note it down.

### 1.3 — Configure Security (Firewall)

In Oracle Cloud Console, go to your instance → **Virtual Cloud Network** → **Security Lists** → **Add Ingress Rules**:

| Source Type | Source | Protocol | Port | Description |
|-------------|--------|----------|------|-------------|
| CIDR | `0.0.0.0/0` | TCP | `22` | SSH (already added) |
| CIDR | `0.0.0.0/0` | TCP | `80` | HTTP |
| CIDR | `0.0.0.0/0` | TCP | `443` | HTTPS |

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

## Step 3: Run Setup on Oracle VM

SSH into your VM, then:

```bash
# 1. Edit the setup script with your repo URL
nano deploy/setup.sh
# → Change REPO_URL to your GitHub repo URL
# → Optionally set DOMAIN and ADMIN_EMAIL for HTTPS

# 2. Make it executable and run
chmod +x deploy/setup.sh
sudo bash deploy/setup.sh
```

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
# On the VM, run:
sudo certbot --nginx -d yourdomain.com --non-interactive --agree-tos -m admin@yourdomain.com
```

Then update `deploy/nginx.conf` to uncomment the HTTPS server block.

**Option B: Without a domain (IP only)**

HTTPS won't work with a bare IP. Two alternatives:
1. Use **Cloudflare** to proxy your IP → get free SSL
2. Or just use HTTP for now (works fine for testing)

---

## Step 5: Deploy Frontend to Vercel

This is optional — you can also serve the frontend from the VM via Nginx. But Vercel is faster.

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo (`venuepro-saas`)
3. Configure:
   - **Root Directory:** `saas-platform/client`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add Environment Variables:
   - `VITE_API_URL=https://your-oracle-ip.nip.io` (or your domain)
5. Click **Deploy**

⚠️ **Important:** Update `CORS_ORIGINS` in `server/.env` on your VM to include your Vercel domain.

---

## Step 6: Verify Everything Works

```bash
# On the VM — check services
pm2 status
sudo systemctl status nginx
sudo systemctl status mongod

# Health check
curl http://localhost:5000/api/health

# From your browser
http://YOUR_VM_IP/api/health
http://YOUR_VM_IP/api-docs
```

### Test login:
```
URL: http://YOUR_VM_IP
Email: (the email you set during setup)
Password: (the password you set during setup)
```

---

## 📦 Deploying Updates

Whenever you push new code to GitHub:

```bash
# SSH into the VM
ssh -i your-key.pem ubuntu@YOUR_VM_IP

# Run the deploy script
bash deploy/deploy.sh
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
| `Connection refused` on port 22 | Check Oracle Security List — SSH rule must exist |
| `502 Bad Gateway` from Nginx | Node server isn't running: `pm2 start venuepro-api` |
| `MongoDB connection error` | Check: `sudo systemctl status mongod` |
| `CORS error` in browser | Update `CORS_ORIGINS` in `server/.env` |
| Port 80 not opening | Check Oracle Security List + `sudo ufw status` |
| App returning HTML instead of JSON | Nginx not proxying `/api/` correctly — check nginx.conf |

---

## 💰 Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| Oracle Cloud VM | **Free** | 4 OCPU · 24GB RAM · Always-on |
| MongoDB | **Free** | Runs on the same VM |
| Vercel (frontend) | **Free** | 100GB bandwidth/month |
| Domain (optional) | ~$10/year | e.g., GoDaddy, Namecheap |
| SSL certificate | **Free** | Let's Encrypt (auto-renewed) |

**Total: $0/year** (or ~$10 if you buy a domain)

---

> **Last updated:** May 27, 2026 · Questions? Ask Buffy!
