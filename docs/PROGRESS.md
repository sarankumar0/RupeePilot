# RupeePilot — Progress Log

This file tracks everything we build, step by step.

---

## Project Overview

**RupeePilot** is a personal finance assistant for young Indian professionals and freelancers.

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | NestJS + TypeScript |
| Database | MongoDB + Mongoose |
| AI | Groq API (llama3-70b) |
| Bot | Telegram Bot API |
| Auth | NextAuth.js (Google login) — Phase 2 |
| Payments | Razorpay — Phase 2 |
| Deploy | Vercel (frontend) + Railway (backend) — later |

---

## Environment

| Tool | Version |
|------|---------|
| Node.js | v24.11.1 |
| npm | 11.6.2 |
| Git | 2.52.0 |
| MongoDB | Running as Windows service |
| NestJS CLI | 11.0.12 |
| OS | Windows 11 |

---

## GitHub

- Repository: `https://github.com/sarankumar0/RupeePilot.git`
- Branch: `main`
- Git identity for this project: `sarankumar7319@gmail.com` (local config — separate from work email)

---

## How to Run the Project

```powershell
# Start the backend
cd backend
npm run start

# Backend runs at: http://localhost:3000
# MongoDB connects automatically on startup
```

> Always use `Invoke-RestMethod` in PowerShell for API testing — not `curl.exe` (it breaks with JSON)

---

## Step 1 — Project Structure ✅
**Date:** 2026-03-20

### What we built
The skeleton of the entire project — folders, gitignore, README.

### Folder Structure
```
RupeePilot/
├── backend/        # NestJS API — handles Telegram webhook, AI, database
│   └── src/        # All backend source code lives here
├── frontend/       # Next.js — web dashboard (not built yet)
├── docs/
│   └── PROGRESS.md # This file — our build log
├── .gitignore      # Ignores node_modules, .env, build output
├── plan.md         # Original product plan
└── README.md       # Project introduction
```

### Why this structure?
- `backend/` and `frontend/` are completely separate apps inside one Git repo (monorepo style)
- `docs/` keeps all documentation in one place so nothing gets lost
- `.gitignore` prevents secrets (`.env`) and junk (`node_modules`) from going to GitHub

---

## Step 2 — NestJS Backend + MongoDB ✅
**Date:** 2026-03-20

### What we built
- Initialised NestJS project inside `backend/`
- Installed `@nestjs/config` — loads `.env` file automatically
- Installed `@nestjs/mongoose` + `mongoose` — connects to MongoDB
- MongoDB connects automatically every time the server starts

### Packages installed
```
@nestjs/config
@nestjs/mongoose
mongoose
```

### Key files
| File | What it does |
|------|-------------|
| `backend/src/main.ts` | Entry point — starts the server on port 3000 |
| `backend/src/app.module.ts` | Root module — loads ConfigModule and MongooseModule |
| `backend/src/app.controller.ts` | Handles `GET /` → returns "Hello World!" |
| `backend/src/app.service.ts` | Business logic for the root route |
| `backend/.env` | Secret config — never committed to GitHub |

### .env contents
```
MONGODB_URI=mongodb://localhost:27017/rupeepilot
PORT=3000
```

### NestJS concepts learned
| Concept | What it means |
|---------|--------------|
| Module | Groups related code together — like a folder but smarter |
| Controller | Listens for HTTP requests and responds |
| Service | Contains the actual business logic |
| `@Injectable()` | Lets NestJS manage and share this class automatically |
| `ConfigModule.forRoot({ isGlobal: true })` | Makes `.env` values available everywhere |
| `MongooseModule.forRoot(...)` | Opens MongoDB connection on startup |

---

## Step 3 — Expense Feature ✅
**Date:** 2026-03-20

### What we built
- Expense Mongoose schema — defines the shape of data stored in MongoDB
- `POST /expenses` — saves a new expense to MongoDB
- `GET /expenses` — returns all saved expenses, newest first

### Files created
| File | What it does |
|------|-------------|
| `backend/src/expenses/expense.schema.ts` | Mongoose schema — fields: amount, merchant, category, rawMessage, date |
| `backend/src/expenses/expenses.service.ts` | `create()` saves to MongoDB, `findAll()` fetches all |
| `backend/src/expenses/expenses.controller.ts` | HTTP routes — POST and GET /expenses |
| `backend/src/expenses/expenses.module.ts` | Ties schema + service + controller together, registered in AppModule |

### Expense schema fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| amount | number | yes | How much was spent — e.g. 450 |
| merchant | string | yes | Where it was spent — e.g. "Zomato" |
| category | string | yes | Spending category — e.g. "Food" |
| rawMessage | string | yes | Original message typed by user |
| date | Date | no | Defaults to current time |
| createdAt | Date | auto | Added by MongoDB timestamps |
| updatedAt | Date | auto | Added by MongoDB timestamps |

### API Endpoints
| Method | URL | Body | Response |
|--------|-----|------|----------|
| POST | `/expenses` | `{ amount, merchant, category, rawMessage }` | Saved expense object |
| GET | `/expenses` | none | `{ count, expenses[] }` |

### How to test (PowerShell)
```powershell
# Save a new expense
Invoke-RestMethod -Method POST -Uri http://localhost:3000/expenses -ContentType "application/json" -Body '{"amount": 450, "merchant": "Zomato", "category": "Food", "rawMessage": "Spent 450 Zomato"}'

# Get all expenses
Invoke-RestMethod -Uri http://localhost:3000/expenses
```

### Tested and verified ✅
- POST saves to MongoDB with auto-generated `_id`
- GET returns saved expense with `count: 1`
- Timestamps (createdAt, updatedAt) added automatically

---

## What comes next — Step 4: Groq AI Integration

Connect Groq API so natural language gets parsed automatically:
- User sends: `"Spent ₹450 Zomato"`
- AI extracts: `{ amount: 450, merchant: "Zomato", category: "Food" }`
- Backend auto-saves — no manual field entry needed

**Before Step 4:** Get your free Groq API key at https://console.groq.com

---
