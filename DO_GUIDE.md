# 🚀 VenuePro SaaS — DigitalOcean Droplet Beginner's Guide

> **You know nothing about servers? Perfect. This guide is for you.**
> Read it from top to bottom ONCE, then use it as a reference whenever you need to do something.

---

## 📖 Table of Contents

1. [What even IS a Droplet?](#-1-what-even-is-a-droplet)
2. [How to access your Droplet (SSH)](#-2-how-to-access-your-droplet-ssh)
3. [The Dashboard — DigitalOcean control panel](#-3-the-dashboard--digitalocean-control-panel)
4. [Checking if your app is running](#-4-checking-if-your-app-is-running)
5. [Viewing server logs](#-5-viewing-server-logs)
6. [Restarting the server](#-6-restarting-the-server)
7. [Deploying new code updates](#-7-deploying-new-code-updates)
8. [Checking the database (MongoDB)](#-8-checking-the-database-mongodb)
9. [Checking your billing / remaining credit](#-9-checking-your-billing--remaining-credit)
10. [Common problems & how to fix them](#-10-common-problems--how-to-fix-them)
11. [Glossary of words you'll hear](#-11-glossary-of-words-youll-hear)

---

## 🖥️ 1. What even IS a Droplet?

**Imagine this:** Your VenuePro app runs on YOUR computer right now (localhost). But for other people to use it, it needs to be on a computer that's ALWAYS on and ALWAYS connected to the internet.

A **DigitalOcean Droplet** is exactly that — **a computer in a data center** that runs 24/7. It's like renting a laptop in a server room somewhere, and you control it remotely.

**What's installed on your Droplet:**

```
Your Droplet (Ubuntu Linux)
│
├── Node.js          ← Runs your backend code (JavaScript server)
├── MongoDB          ← Your database (stores all users, bookings, payments, etc.)
├── Nginx            ← The "front door" — catches visitors and directs them
├── PM2              ← The "babysitter" — keeps your server running, restarts it if it crashes
└── Git              ← Connects to GitHub to pull your code
```

**How people use your app:**

```
A visitor opens your website
        │
        ▼
Vercel (frontend)  ← The React UI they see
        │
        ▼
Your Droplet IP  ← Where the backend API + database live
        │
        ▼
Nginx → Node.js (Express) → MongoDB
```

---

## 🔑 2. How to access your Droplet (SSH)

SSH = **Secure SHell**. It's how you open a terminal/command prompt on your remote Droplet from your local computer.

### On Windows (using Command Prompt or PowerShell):

```bash
# Replace with your actual Droplet IP
ssh root@YOUR_DROPLET_IP
```

**Example:**
```bash
ssh root@142.93.123.456
```

### What happens when you SSH:

1. It'll ask for a **password** (the one you set when creating the Droplet)
2. If you set up an **SSH key**, it'll log in automatically
3. You'll see something like: `root@venuepro-saas:~#`

**You're now INSIDE your Droplet!** Any command you type runs on the remote server.

### To exit the Droplet and go back to your computer:

```bash
exit
```
or press `Ctrl + D`

### 💡 Important: Every time you see a command in this guide starting with `#`, it means "run this on the Droplet after SSH'ing in."

---

## 🌐 3. The Dashboard — DigitalOcean control panel

Go to [cloud.digitalocean.com](https://cloud.digitalocean.com) and log in.

Here's what matters:

| Section | What it shows |
|---------|--------------|
| **Droplets** | Your server — its IP address, status (should be green ✅), specs |
| **Networking** | Firewall rules, IP addresses |
| **Billing** | How much credit you have left |
| **Monitoring** | CPU/RAM usage graphs |

**Your Droplet's IP address** is shown on the Droplets page. Write it down somewhere — you'll need it for everything.

---

## ✅ 4. Checking if your app is running

### Quick health check (from your browser)

Open your browser and go to:
```
http://YOUR_DROPLET_IP/api/health
```

**You should see:**
```json
{ "success": true, "data": { "status": "healthy", ... } }
```

If you see this, your server is running ✅

### Check from inside the Droplet

SSH into your Droplet, then run:

```bash
# Check if Node.js server is running
pm2 status
```

**Expected output:**
```
┌─────┬──────────────┬────────┬─────────┐
│ id  │ name         │ status │ restart │
├─────┼──────────────┼────────┼─────────┤
│ 0   │ venuepro-api │ online │    0    │
└─────┴──────────────┴────────┴─────────┘
```

`status = online` means it's running ✅

### Check all services:

```bash
# Check all 3 services at once
echo "── PM2 ──" && pm2 status && echo "── Nginx ──" && sudo systemctl status nginx --no-pager | head -3 && echo "── MongoDB ──" && sudo systemctl status mongod --no-pager | head -3
```

All three should show `active (running)`.

---

## 📜 5. Viewing server logs

Logs help you understand what's happening — errors, crashes, user activity.

### Live logs (updates in real-time):

```bash
pm2 logs venuepro-api
```

Press `Ctrl + C` to stop watching.

### Last 100 lines of logs:

```bash
pm2 logs venuepro-api --lines 100
```

### Save logs to a file:

```bash
pm2 logs venuepro-api --lines 500 > /root/logs.txt
```

### Check Nginx logs (for website/connection issues):

```bash
# Error log — shows 404s, 502s, etc.
sudo tail -50 /var/log/nginx/error.log

# Access log — shows every visitor
sudo tail -50 /var/log/nginx/access.log
```

### Check MongoDB logs:

```bash
sudo tail -50 /var/log/mongodb/mongod.log
```

---

## 🔄 6. Restarting the server

### If the app is misbehaving or you changed settings:

```bash
# Restart just the Node.js app
pm2 restart venuepro-api
```

### Restart everything (if things are really broken):

```bash
pm2 restart venuepro-api
sudo systemctl restart nginx
sudo systemctl restart mongod
```

### If the server won't start at all:

```bash
# Try starting it
pm2 start venuepro-api

# If that fails, start it fresh
cd /root/venuepro-saas/server
node server.js
```

---

## 🚢 7. Deploying new code updates

Whenever you make changes to the code and push to GitHub, here's how to get them onto the Droplet:

### Step 1: Push your changes to GitHub (on YOUR computer)

```bash
cd "E:/Project/Multi Tenat SaaS for sporting facilty/saas-platform"
git add .
git commit -m "what you changed"
git push
```

### Step 2: SSH into the Droplet and deploy

```bash
# SSH in
ssh root@YOUR_DROPLET_IP

# Run the deploy script
cd /root/venuepro-saas
bash deploy/deploy.sh
```

**The script does:**
1. `git pull` — downloads your new code
2. `npm install` — installs any new dependencies
3. `npm run build` — rebuilds the frontend
4. Reloads Nginx config
5. Restarts the Node server

**If you changed server-side files only (no frontend changes), you can just restart:**
```bash
cd /root/venuepro-saas
git pull
pm2 restart venuepro-api
```

### Step 3: Hard refresh your browser

After deploying, press `Ctrl + F5` or `Cmd + Shift + R` in your browser to clear cache and see the changes.

---

## 🗄️ 8. Checking the database (MongoDB)

MongoDB is where all your data lives — users, bookings, payments, etc.

### Open MongoDB shell:

```bash
mongosh
```

### Now you're inside the MongoDB shell (notice the prompt changed to `test>`):

```javascript
// Switch to our database
use sports_facility_saas

// List all collections (tables)
show collections

// View all owner users
db.ownerusers.find()

// View all tenants (businesses)
db.tenants.find()

// View a specific tenant by email
db.tenants.findOne({ ownerEmail: "admin@myvenue.com" })

// Count how many players there are
db.players.countDocuments()

// View recent bookings
db.bookingsessions.find().sort({ createdAt: -1 }).limit(5)

// Exit MongoDB shell
exit
```

### 💡 You can also check the database from your browser using:

```
http://YOUR_DROPLET_IP:5001
```
(only if you have Mongo Express installed)

---

## 💰 9. Checking your billing / remaining credit

1. Go to [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. Click **Billing** in the left sidebar
3. You'll see:
   - **Account Balance** — Your remaining $200 credit (e.g., `$185.32`)
   - **Monthly Usage** — How much you used this month
   - **Estimated Next Bill** — What'll be deducted next month

**Your Droplet costs $6/month.** With $200 credit, you get ~33 months free.

### 🔔 Set a billing alert so you don't get surprised:

1. Go to **Billing → Alerts**
2. Click **Create Alert**
3. Set:
   - Alert at: `$50`
   - Email to: your email
4. This will email you when your credit drops below $50 so you can plan.

---

## 🔧 10. Common problems & how to fix them

### ❌ "502 Bad Gateway" in browser

**Cause:** Node.js server crashed or is restarting.

**Fix:**
```bash
pm2 restart venuepro-api
```

### ❌ "Cannot GET /" or blank page

**Cause:** Frontend not built or Nginx misconfigured.

**Fix:**
```bash
cd /root/venuepro-saas/client
npm run build
sudo systemctl reload nginx
```

### ❌ "ECONNREFUSED ::1:27017" or "MongoDB connection error"

**Cause:** MongoDB isn't running.

**Fix:**
```bash
sudo systemctl start mongod
sudo systemctl status mongod   # Verify it's running
```

### ❌ "Tenant or business type not found"

**Cause:** The tenant's business type is missing from the database.

**Fix:** This happens on rare data issues. Our code fix (already applied) falls back to the JWT token so it should work now. If still broken, re-deploy latest code.

### ❌ Port 80 not opening / site not accessible

**Cause:** Firewall blocking HTTP traffic.

**Fix:**
```bash
sudo ufw status           # Check firewall rules
sudo ufw allow 'Nginx Full'   # Allow HTTP + HTTPS
```

### ❌ PM2 process is "errored" or "stopped"

**Cause:** App crashed due to a bug.

**Fix:**
```bash
pm2 logs venuepro-api --lines 50   # Check what error caused the crash
pm2 restart venuepro-api            # Restart it
```

### ❌ "SSL_ERROR_BAD_CERT_DOMAIN" in browser

**Cause:** SSL certificate issue (if you set up HTTPS).

**Fix:**
```bash
sudo certbot renew           # Renew the certificate
sudo systemctl reload nginx  # Reload Nginx
```

### ❌ Can't SSH into Droplet ("Connection refused" or "Connection timed out")

**Cause 1:** Your IP changed (if you're on a different WiFi/network).

**Fix 1:** Check your Droplet's firewall in DigitalOcean dashboard → Networking → Firewalls → ensure SSH (port 22) is allowed from everywhere (`0.0.0.0/0`).

**Cause 2:** Droplet is off.

**Fix 2:** In DigitalOcean dashboard → Droplets → click your droplet → click "Power On".

---

## 📚 11. Glossary of words you'll hear

| Term | What it means |
|------|--------------|
| **Droplet** | A virtual computer/server in DigitalOcean's data center |
| **SSH** | Secure Shell — the way you open a terminal on your remote Droplet |
| **IP address** | The internet address of your Droplet (like a phone number for computers) |
| **Port** | A "door" on your server — port 80 = web traffic, port 22 = SSH, port 5000 = your Node app |
| **Node.js** | The JavaScript engine that runs your backend code |
| **Express** | The web framework your server uses (handles API requests) |
| **MongoDB** | Your database — stores all the data (users, bookings, payments) |
| **Nginx** | The web server that acts as a front door — directs visitors to the right place |
| **PM2** | A process manager — keeps your Node app running, restarts it if it crashes |
| **Reverse proxy** | Nginx sits in front of Node.js and forwards requests to it |
| **Git** | Version control — tracks changes to your code |
| **git pull** | Download latest code from GitHub |
| **git push** | Upload your changes to GitHub |
| **Repository** | The folder where your code lives (on GitHub) |
| **Deploy** | The act of putting your latest code onto the live server |
| **Logs** | Text files that record what the server is doing (useful for debugging) |
| **Environment variables** | Settings stored in `.env` file (like passwords, API keys) |
| **API** | The backend endpoints your frontend calls to get/save data |
| **CORS** | A security setting that controls which websites can call your API |
| **SSL / HTTPS** | Encrypted connection — the padlock icon in browser address bar |
| **Certificate** | The digital file that enables HTTPS |
| **VM** | Virtual Machine — another name for a Droplet |
| **SSD** | Solid State Drive — fast storage |
| **vCPU** | Virtual CPU — one processing unit of your Droplet |
| **RAM** | Memory — your Droplet has 1GB (enough for this app) |
| **Load balancer** | Distributes traffic across multiple Droplets (you don't need this) |
| **Snapshot** | A backup of your entire Droplet (can restore if something breaks) |

---

## 🏃 Quick reference card

Print this or save it somewhere:

```bash
# SSH INTO DROPLET
ssh root@YOUR_DROPLET_IP

# CHECK STATUS
pm2 status                       # Is Node running?
curl http://localhost:5000/api/health  # API health check

# VIEW LOGS
pm2 logs venuepro-api --lines 50

# RESTART APP
pm2 restart venuepro-api

# DEPLOY NEW CODE
cd /root/venuepro-saas
bash deploy/deploy.sh

# CHECK DATABASE
mongosh
use sports_facility_saas
show collections

# CHECK MONGO STATUS
sudo systemctl status mongod

# EXIT DROPLET
exit
```

---

> **Last updated:** June 2, 2026 · Questions? Just ask Buffy!
>
> **Your Droplet IP:** Check it at [cloud.digitalocean.com](https://cloud.digitalocean.com) → Droplets
> **Your GitHub repo:** `https://github.com/SarthakVaishampayan/VenuePro.git`
> **Your app directory on Droplet:** `/root/venuepro-saas/`

