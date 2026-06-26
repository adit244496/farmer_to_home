# Farmer-to-Home — Technical Specification

**Version:** 1.0  
**Date:** June 2026  
**Author:** Aditya Tambe  

---

## 1. Project Overview

Farmer-to-Home is a full-stack e-commerce platform that connects Indian farmers directly with consumers — eliminating middlemen and enabling fair pricing for both sides. The platform supports three user roles: **Customer**, **Farmer**, and **Admin**.

**Live URL:** https://farmertohome.in  
**API Docs:** https://farmertohome.in/docs  
**GitHub:** https://github.com/adit244496/farmer_to_home

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                      EC2 Instance                    │
│                  (Amazon Linux 2023)                 │
│                                                     │
│  ┌──────────┐    ┌──────────┐    ┌───────────────┐  │
│  │  Nginx   │───▶│ FastAPI  │───▶│  PostgreSQL   │  │
│  │ (Port 80 │    │(Port 8000│    │  (Port 5432)  │  │
│  │   /443)  │    │  4 workers)   │               │  │
│  └──────────┘    └──────────┘    └───────────────┘  │
│       │               │                             │
│  Serves static    ┌──────────┐                      │
│  web files        │  Redis   │                      │
│  from /dist       │(Port 6379│                      │
│                   │  Cache + │                      │
│                   │  OTP)    │                      │
│                   └──────────┘                      │
│                                                     │
│  All services run in Docker containers              │
│  managed by Docker Compose                         │
└─────────────────────────────────────────────────────┘
         │                        │
    ┌────▼────┐              ┌────▼────┐
    │  Web    │              │  AWS S3 │
    │ Browser │              │ (Images)│
    └─────────┘              └─────────┘
```

### Request Flow
1. Browser hits `https://farmertohome.in`
2. Nginx serves static React Native Web files (`dist/`)
3. API calls to `/api/v1/*` are proxied by Nginx to FastAPI backend
4. FastAPI connects to PostgreSQL (data) and Redis (OTP/cache)
5. File uploads go directly to AWS S3

---

## 3. Tech Stack

### Backend
| Component | Technology |
|---|---|
| Framework | FastAPI (Python 3.11) |
| Database | PostgreSQL 16 |
| Cache / OTP Store | Redis 7 |
| ORM | SQLAlchemy (async) + asyncpg |
| Migrations | Alembic |
| Validation | Pydantic v2 |
| Auth | JWT (access 15min, refresh 30d) |
| File Storage | AWS S3 (ap-south-1) |
| Payments | Razorpay (UPI, Card, Net Banking, COD) |
| ASGI Server | Uvicorn (4 workers) |

### Frontend
| Component | Technology |
|---|---|
| Framework | React Native + Expo SDK 51 |
| Web Support | React Native Web |
| Routing | Expo Router (file-based) |
| State Management | Zustand |
| API Client | Axios + TanStack Query v5 |
| Internationalisation | i18next (Marathi + English) |
| UI | Custom components, @expo/vector-icons |
| Build Tool | Metro Bundler |

### Infrastructure
| Component | Technology |
|---|---|
| Cloud | AWS EC2 (Amazon Linux 2023) |
| Containerisation | Docker + Docker Compose |
| Reverse Proxy | Nginx |
| SSL | Let's Encrypt (auto-renews every 90 days) |
| Domain | farmertohome.in |

---

## 4. User Roles

### Customer
- OTP-based login (mobile number or email)
- Browse products by category
- Search with Marathi/Hindi transliteration support
- Add to cart, checkout, track orders
- Rate and review products
- Manage delivery addresses

### Farmer
- Password + OTP login
- Requires Admin approval before accessing dashboard (`PENDING → APPROVED`)
- List and manage products with stock
- View and process incoming orders
- View earnings and ratings

### Admin
- Password login at `/admin` (hidden route)
- Approve/reject farmer registrations
- Manage categories and platform settings
- View all orders and users
- Configure platform commission (default 5%)

---

## 5. API Structure

Base URL: `https://farmertohome.in/api/v1`

| Module | Prefix | Description |
|---|---|---|
| Auth | `/auth` | OTP request/verify, JWT refresh, logout |
| Customers | `/customers` | Profile, addresses |
| Farmers | `/farmers` | Profile, products, orders |
| Products | `/products` | Listing, detail, search |
| Categories | `/categories` | Category tree |
| Cart | `/cart` | Add/remove/update items |
| Orders | `/orders` | Place, track, cancel orders |
| Payments | `/payments` | Razorpay create/verify |
| Reviews | `/reviews` | Submit and fetch reviews |
| Admin | `/admin` | Admin-only operations |

Full interactive documentation: https://farmertohome.in/docs

---

## 6. Database Models

| Model | Key Fields |
|---|---|
| User | id, phone, email, role (CUSTOMER/FARMER/ADMIN), is_active |
| FarmerProfile | user_id, farm_name, status (PENDING/APPROVED/REJECTED), rating |
| CustomerProfile | user_id, name, avatar_url |
| Category | id, name_en, name_mr, slug, icon_url |
| Product | id, farmer_id, category_id, name_en, name_mr, price, stock, unit |
| Address | id, customer_id, line1, city, state, pincode, is_default |
| Cart | id, customer_id → CartItem (product_id, qty) |
| Order | id, customer_id, status, total, delivery_charge, commission |
| OrderItem | order_id, product_id, farmer_id, qty, price |
| Payment | order_id, razorpay_order_id, status, method |
| Review | customer_id, product_id, order_id, rating, comment |

### Order Status Flow
```
PLACED → CONFIRMED → PACKED → DISPATCHED → DELIVERED → COMPLETED
                                     ↓
              CANCELLED_BY_CUSTOMER (within 1 hour of placing)
              CANCELLED_BY_FARMER
              CANCELLED_BY_ADMIN
```

---

## 7. Authentication Flow

### Customer (OTP)
```
POST /api/v1/auth/otp/request   { phone: "+91XXXXXXXXXX" }
       ↓ OTP sent via SMS, stored in Redis (10 min TTL)
POST /api/v1/auth/otp/verify    { phone, otp }
       ↓ Returns { access_token, refresh_token }
```

### Farmer / Admin (Password)
```
POST /api/v1/auth/login   { email, password }
       ↓ Returns { access_token, refresh_token }
```

### Token Refresh
```
POST /api/v1/auth/token/refresh   { refresh: "<token>" }
       ↓ Returns new access_token
```

---

## 8. Business Rules

| Rule | Value |
|---|---|
| Platform commission | 5% (configurable by admin) |
| Delivery charge | ₹30 per farmer |
| Free delivery threshold | Orders ≥ ₹300 from same farmer |
| OTP expiry | 10 minutes |
| Access token expiry | 15 minutes |
| Refresh token expiry | 30 days |
| Farmer rating visibility | Minimum 5 ratings required (else shows "New Farmer") |
| Order cancellation window | Within 1 hour of placing |

---

## 9. Internationalisation

- Default language: **Marathi (mr)**
- Supported: Marathi (`mr`), English (`en`)
- Translation files: `frontend/src/locales/mr/` and `frontend/src/locales/en/`
- Fonts: Noto Sans Devanagari (Marathi), Inter (English)
- Search supports Marathi/Hindi → English transliteration via `pg_trgm` + transliteration table

---

## 10. Deployment

### Infrastructure
- **Server:** AWS EC2 (Amazon Linux 2023), instance type t3.small or above
- **IP:** 13.234.144.136
- **Domain:** farmertohome.in (DNS A record → EC2 IP)
- **SSL:** Let's Encrypt certificate (expires 2026-09-24, auto-renews)

### Docker Services
```yaml
fth_nginx     — Nginx reverse proxy + static file server (ports 80, 443)
fth_backend   — FastAPI application (port 8000, internal only)
fth_postgres  — PostgreSQL 16 database (port 5432, internal only)
fth_redis     — Redis 7 cache (port 6379, internal only)
fth_certbot   — SSL certificate auto-renewal
```

### Deploy Commands (on EC2)
```bash
# First deploy
git clone https://github.com/adit244496/farmer_to_home.git
cd farmer_to_home
./deploy.sh

# Update deployment
git pull
sudo docker compose -f docker-compose.prod.yml up -d --build

# View logs
sudo docker compose -f docker-compose.prod.yml logs backend -f

# Run migrations
sudo docker compose -f docker-compose.prod.yml exec backend \
  alembic -c migrations/alembic.ini upgrade heads
```

### Web App Deploy (from local machine)
```bash
# Build
cd frontend
npx expo export --platform web

# Copy to EC2
scp -i your-key.pem -r dist ec2-user@13.234.144.136:~/apps/farmer_to_home/frontend/

# Restart nginx on EC2
sudo docker compose -f docker-compose.prod.yml restart nginx
```

---

## 11. Environment Variables

All secrets live in `backend/.env.production` on the EC2 server (never committed to git).

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL sync URL (for Alembic) |
| `ASYNC_DATABASE_URL` | PostgreSQL async URL (for SQLAlchemy) |
| `REDIS_URL` | Redis connection URL |
| `SECRET_KEY` | JWT signing key |
| `ADMIN_SECRET_KEY` | Admin JWT signing key |
| `AWS_ACCESS_KEY_ID` | S3 access key |
| `AWS_SECRET_ACCESS_KEY` | S3 secret key |
| `AWS_BUCKET_NAME` | S3 bucket name |
| `RAZORPAY_KEY_ID` | Razorpay public key |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key |
| `CORS_ORIGINS` | Allowed frontend origins |

Frontend API URL is set at build time via `EXPO_PUBLIC_API_URL` in `frontend/.env.production`.

---

## 12. Local Development Setup

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt

# Start dependencies
docker compose up postgres redis -d

# Run server
uvicorn app.main:app --reload --port 8001
```

### Frontend
```bash
cd frontend
npm install
npx expo start --web       # Web browser
npx expo start             # Expo Go (limited)
```

### Full stack with Docker
```bash
docker compose up          # Starts postgres + redis + backend
```

---

## 13. Project Structure

```
farmer_to_home/
├── backend/
│   ├── app/
│   │   ├── api/v1/routers/    # Route handlers (auth, products, orders...)
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   ├── services/          # Business logic layer
│   │   ├── utils/             # S3, notifications helpers
│   │   └── core/              # Config, database, security
│   ├── migrations/            # Alembic migration files
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/                   # Expo Router file-based routes
│   │   ├── auth/              # Login, OTP, register screens
│   │   └── customer/          # Home, product, cart, orders...
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── screens/           # Screen components
│   │   ├── store/             # Zustand stores (auth, cart)
│   │   ├── utils/             # API client, auth helpers
│   │   └── locales/           # i18n translations (mr, en)
│   └── dist/                  # Web build output (not in git)
├── nginx/
│   ├── nginx.conf             # Active nginx config
│   └── nginx.conf.ssl         # SSL config template
├── docker-compose.yml         # Local development
├── docker-compose.prod.yml    # Production
└── deploy.sh                  # EC2 setup script
```

---

## 14. Known Limitations & Future Work

| Item | Status |
|---|---|
| SMS OTP provider (MSG91) | Not configured — OTP stored in Redis only |
| Push notifications | Removed for web-only deployment |
| Razorpay | Test keys in use — replace with live keys before launch |
| AWS S3 | Needs real credentials for image uploads |
| iOS app | Requires Apple Developer account ($99/year) |
| Android app | EAS build configured, needs Play Store account ($25) |
| Admin panel | API complete, no dedicated web UI yet |
| Farmer dashboard | API complete, no dedicated web UI yet |
