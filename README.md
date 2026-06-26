# 🌾 Farmer to Home

A full-stack e-commerce platform connecting farmers directly to customers. Built for the Indian agri-market with support for **Marathi** and **English** languages.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.11+) |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Frontend | React Native (Expo SDK 51) |
| State | Zustand |
| API Client | Axios + TanStack Query v5 |
| i18n | i18next (Marathi + English) |
| Payments | Razorpay |
| Storage | AWS S3 |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+

### 1. Start Infrastructure

```bash
docker-compose up postgres redis -d
```

### 2. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials

alembic upgrade head
python seed.py
uvicorn app.main:app --reload
```

Backend runs at http://localhost:8000
API docs at http://localhost:8000/docs

### 3. Frontend Setup

```bash
cd frontend
npm install
npx expo start
```

- Web: http://localhost:8081
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR with Expo Go app

## User Roles

| Role | Access |
|---|---|
| Customer | Browse, search, order products |
| Farmer | List products, manage orders (requires admin approval) |
| Admin | Approve farmers, manage platform, view analytics |

## Default Credentials (after seed)

| Role | Phone/Email | Password |
|---|---|---|
| Admin | admin@farmertohome.in | Admin@123 |
| Farmer | 9876543210 | (OTP login) |
| Customer | 9123456789 | (OTP login) |

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string  
- `SECRET_KEY` — JWT signing secret (generate with `openssl rand -hex 32`)
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — from Razorpay dashboard
- `AWS_*` — S3 credentials for image uploads

## Project Structure

```
farmer-to-home/
├── backend/               # FastAPI application
│   ├── app/
│   │   ├── api/v1/       # Route handlers
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic v2 schemas
│   │   ├── services/     # Business logic
│   │   ├── utils/        # Helpers (OTP, S3, search)
│   │   └── core/         # Config, DB, security
│   ├── migrations/       # Alembic migrations
│   ├── seed.py           # DB seeder
│   └── requirements.txt
├── frontend/              # React Native Expo app
│   ├── src/
│   │   ├── screens/      # All screens (auth/customer/farmer/admin)
│   │   ├── components/   # Reusable components
│   │   ├── store/        # Zustand stores
│   │   ├── services/     # API service functions
│   │   ├── locales/      # i18n (en + mr)
│   │   ├── hooks/        # Custom hooks
│   │   ├── theme/        # Colors, spacing, typography
│   │   └── utils/        # Helpers
│   ├── app/              # expo-router layouts
│   └── package.json
└── docker-compose.yml
```

## Features

- Bilingual UI (Marathi / English) with real-time toggle
- Multilingual search: handles Marathi, Hindi, and English product names
  - "टोमॅटो" = "tamatar" = "tomato"
  - "आंबा" = "aam" = "mango"
- OTP-based authentication for customers
- Farmer registration with admin approval workflow
- Full order lifecycle management
- Razorpay payments (UPI, Card, Net Banking, COD)
- Product and farmer rating system
- Push notifications (Expo Notifications)
- Admin dashboard with analytics

## License

Built for Indian farmers. Designed for simplicity.
