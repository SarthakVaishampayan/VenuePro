# 🏟️ VenuePro SaaS

> **Multi-Tenant Sports Facility Management Platform** — Manage pool/snooker parlours, cricket/football turfs, gaming zones, and pickleball courts from a single dashboard.

![Node](https://img.shields.io/badge/Node.js-22.x-339933?logo=nodedotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248?logo=mongodb)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Features

### 👑 Super Admin Platform
- **Multi-tenant management** — Create, manage, and monitor all venue owners
- **Business type registry** — 4 built-in types: Pool & Snooker, Cricket & Football Turf, Gaming Zone, Pickleball Court
- **Subscription plans** — Free, Starter ($39/mo), Professional ($79/mo), Enterprise ($199/mo)
- **Revenue dashboard** — Track MRR, ARR, active tenants, churn rate
- **Owner onboarding** — Create owners with automatic tenant provisioning
- **Support ticket system** — Handle owner queries and issues
- **Audit logging** — Track all admin actions with request tracing
- **Swagger API docs** — Interactive API documentation at `/api-docs`

### 🏢 Tenant Owner Portal
- **Dashboard** — Real-time stats: active sessions, today's revenue, dues, expenses
- **Resource management** — Manage tables/turfs/consoles/courts with status tracking
- **Session booking** — Start/end sessions with automatic time-based billing
- **Payment handling** — Record payments (cash, online, UPI, card) with receipts
- **Due tracking** — Track pending dues with partial payment support
- **Expense management** — Log and categorize venue expenses
- **Staff management** — Manage staff, salary payments, and shift tracking
- **Advanced analytics** — Revenue trends, peak hours, resource utilization
- **PDF reports** — Generate daily, monthly, and custom period reports
- **Multi-branch support** — Manage multiple branches under one account

### 👤 Player Portal
- **Self sign-up** — Players can register and manage their own account
- **Booking history** — View past sessions and payments
- **Due payments** — View and pay pending dues online
- **Responsive UI** — Works on desktop and mobile

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel (CDN)                          │
│              React 19 + Vite + Tailwind 4                │
│         https://venuepro.vercel.app                      │
└────────────────────┬────────────────────────────────────┘
                     │ API calls
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Oracle Cloud VM (Ubuntu)                    │
│                                                          │
│  Nginx (80/443)                                          │
│    ├── /api/*  →  Express (PM2, port 5000)              │
│    │               ├── Platform API (super admin)        │
│    │               ├── Tenant API (venue owners)         │
│    │               ├── Player API (self-service)         │
│    │               └── Module dispatcher (business type) │
│    │                                                     │
│    └── /       →  Static files (client/dist)            │
│                                                          │
│  MongoDB (localhost:27017)                                │
│    └── sports_facility_saas                              │
└─────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Pattern | Why |
|---------|-----|
| **Multi-tenant with shared DB** | Single MongoDB instance — each tenant owns their data via `tenantId` field |
| **Module dispatcher pattern** | Routes dispatch to the correct business type controller based on tenant's registered type |
| **Tenant-aware resource/booking** | Centralized resource & booking endpoints that delegate per business type |
| **JWT access + refresh tokens** | 15-min access tokens, 7-day refresh tokens with rotation |

#### Supported Business Types

| Type | Pricing Model | Resources | Booking Mode |
|------|--------------|-----------|-------------|
| 🎱 Pool & Snooker | Time-based | Tables | Session |
| 🏏 Cricket & Football Turf | Slot-based | Turfs | Slot |
| 🎮 Gaming Zone | Time-based | Consoles | Session |
| 🏓 Pickleball Court | Time-based | Courts | Configurable |

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js 22.x (ES Modules)
- **Framework:** Express 4.x
- **Database:** MongoDB 7.x + Mongoose 8.x
- **Auth:** JWT (jsonwebtoken), bcryptjs
- **Validation:** Zod
- **Security:** Helmet, CORS, rate limiting, mongo-sanitize
- **Logging:** Winston + Morgan
- **Docs:** Swagger (swagger-jsdoc + swagger-ui-express)
- **Scheduling:** node-cron

### Frontend
- **Framework:** React 19
- **Build tool:** Vite 8
- **Styling:** Tailwind CSS 4
- **Routing:** React Router 7
- **Charts:** Recharts
- **Icons:** Lucide React
- **HTTP:** Axios

---

## 🚀 Getting Started

### Prerequisites
- Node.js 22.x
- MongoDB 7.x (local or Atlas)
- Git

### 1. Clone & Install
```bash
git clone https://github.com/SarthakVaishampayan/VenuePro.git
cd VenuePro

# Install all dependencies (root + server + client)
npm run install:all
```

### 2. Configure Environment
```bash
cd server
cp .env.example .env   # or create manually
```

Edit `server/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/sports_facility_saas
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
NODE_ENV=development
PORT=5000
CORS_ORIGINS=http://localhost:5173
```

### 3. Seed the Database
```bash
npm run seed
```

This creates:
- **Super Admin** — manage all tenants (default: `admin@venuepro.com` / `Admin@123`)
- **4 Business Types** — Pool & Snooker, Cricket & Football, Gaming Zone, Pickleball
- **4 Subscription Plans** — Free, Starter, Professional, Enterprise

> Set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` env vars before seeding for custom credentials.

### 4. Start Development
```bash
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:5000
- **API Docs:** http://localhost:5000/api-docs

---

## 📁 Project Structure

```
saas-platform/
├── client/                          # React frontend
│   └── src/
│       ├── core/                    # Shared platform UI
│       │   ├── context/             # Auth contexts (superadmin, owner, player)
│       │   ├── pages/               # Page components
│       │   │   ├── auth/            # Login, forgot password
│       │   │   ├── owner/           # Tenant owner dashboard
│       │   │   ├── player/          # Player portal
│       │   │   └── staff/           # Staff pages
│       │   └── services/            # API service layer
│       ├── modules/                 # Business-type specific UI
│       └── App.jsx                  # Root with routing
│
├── server/                          # Express backend
│   ├── core/                        # Platform-wide code
│   │   ├── config/                  # DB, constants, logger
│   │   ├── middleware/              # Auth, error handling, rate limiting
│   │   ├── models/                  # SuperAdmin, Tenant, Player, etc.
│   │   ├── routes/                  # Platform API routes
│   │   ├── services/                # Business logic (auth, email, etc.)
│   │   └── swagger/                 # API documentation config
│   ├── modules/                     # Business type modules
│   │   ├── pool-snooker/
│   │   ├── pickleball/
│   │   ├── cricket-football/
│   │   └── gaming-zone/
│   ├── jobs/                        # Cron jobs (demo cleanup)
│   ├── server.js                    # Entry point
│   └── seed.js                      # Database seeder
│
├── deploy/                          # Deployment configs
│   ├── setup.sh                     # First-time Oracle Cloud setup
│   ├── deploy.sh                    # Update deployment script
│   ├── nginx.conf                   # Nginx reverse proxy config
│   └── .env.production              # Production env template
│
├── DEPLOY_GUIDE.md                  # Full deployment guide
├── README.md                        # This file
└── package.json                     # Root workspace scripts
```

---

## 🧪 Running Tests

```bash
# Backend tests (Jest + Supertest)
npm test

# Lint frontend
npm run lint
```

---

## 🚢 Deployment

**Recommended stack:** Oracle Cloud VM (free tier) + Vercel (free)

| Component | Platform | Cost |
|-----------|----------|------|
| Backend + DB | Oracle Cloud VM | **Free** (4 OCPU, 24GB RAM) |
| Frontend | Vercel | **Free** (100GB bandwidth) |
| Domain | Optional | ~$10/year |

See **[DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)** for step-by-step instructions.

### Quick deploy
```bash
# 1. Push to GitHub
git push origin main

# 2. SSH into Oracle VM
ssh -i your-key.pem ubuntu@YOUR_VM_IP

# 3. Run setup (first time only)
sudo bash deploy/setup.sh

# 4. Future updates
bash deploy/deploy.sh
```

---

## 🔐 API Overview

| Endpoint | Description | Auth |
|----------|-------------|------|
| `POST /api/platform/auth/login` | Super admin login | None |
| `POST /api/platform/auth/reset-password` | Super admin password reset | None |
| `GET /api/platform/tenants` | List all tenants | Super admin |
| `POST /api/platform/tenants` | Create tenant + owner | Super admin |
| `GET /api/platform/dashboard` | Platform analytics | Super admin |
| `POST /api/tenant/auth/login` | Owner login | None |
| `GET /api/tenant/dashboard` | Owner dashboard | Tenant owner |
| `GET /api/tenant/resources` | List venue resources | Tenant owner |
| `POST /api/tenant/bookings` | Create booking/session | Tenant owner |
| `POST /api/tenant/payments` | Record payment | Tenant owner |
| `GET /api/tenant/dues` | List pending dues | Tenant owner |
| `POST /api/player/auth/signup` | Player self-registration | None |
| `POST /api/player/auth/login` | Player login | None |
| `GET /api/player/payments` | Player payment history | Player |
| `GET /api/player/dues` | Player pending dues | Player |

Full interactive docs at `/api-docs` when the server is running.

---

## 🔒 Security

- **Password hashing:** bcryptjs with 12 salt rounds
- **JWT tokens:** 15-min access + 7-day refresh with rotation
- **Account lockout:** 5 failed attempts = 15-min lockout
- **Rate limiting:** 10 auth requests / 15 min, 100 general / min
- **NoSQL injection:** Sanitized via express-mongo-sanitize
- **HTTP headers:** Secured via Helmet
- **CORS:** Whitelist-based origin restriction
- **Request logging:** All requests logged with Winston + Morgan

---

## 📄 License

MIT — feel free to use this project for personal or commercial purposes.

---

## 🙋‍♂️ Support

- **Issues:** Open a GitHub issue
- **Documentation:** See `DEPLOY_GUIDE.md` for deployment help
- **API Docs:** Interactive Swagger docs at `/api-docs`

---

> Built with ❤️ by Sarthak Vaishampayan
