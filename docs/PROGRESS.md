# RupeePilot — Progress Log

This file tracks everything we build, step by step.

---

## Step 1 — Project Structure ✅
**Date:** 2026-03-20
**What we built:** The skeleton of the entire project.

### Folder Structure
```
RupeePilot/
├── backend/        # NestJS API — handles Telegram webhook, AI, database
├── frontend/       # Next.js — web dashboard the user sees
├── docs/           # All documentation lives here
│   └── PROGRESS.md # This file — our build log
├── .gitignore      # Tells Git which files to ignore (node_modules, .env etc.)
├── plan.md         # Original product plan
└── README.md       # Project introduction
```

### Why this structure?
- **backend/** and **frontend/** are completely separate projects. This is called a "monorepo" style — one Git repo, two apps.
- Keeping them separate means the frontend team (you, later) and backend team (also you) can work without stepping on each other.
- **docs/** is where all our documentation lives so nothing gets lost.

---

## Step 2 — NestJS Backend + MongoDB ✅
**Date:** 2026-03-20

### What we built
- Initialised NestJS project inside `backend/`
- Installed and configured `@nestjs/config` to load `.env` files
- Installed `@nestjs/mongoose` and `mongoose` to connect to MongoDB
- MongoDB connects automatically on server startup

### Key files
| File | What it does |
|------|-------------|
| `backend/src/main.ts` | Entry point — starts the server on port 3000 |
| `backend/src/app.module.ts` | Root module — loads config and MongoDB connection |
| `backend/src/app.controller.ts` | Handles HTTP requests |
| `backend/src/app.service.ts` | Business logic lives here |
| `backend/.env` | Secret config values — never committed to GitHub |

### How to run
```bash
cd backend
npm run start
```
Visit `http://localhost:3000` — should show "Hello World!"

### Config files explained
- `.env` — stores `MONGODB_URI` and `PORT`
- `ConfigModule.forRoot({ isGlobal: true })` — makes `.env` values available everywhere
- `MongooseModule.forRoot(...)` — opens the MongoDB connection on startup

---

## Step 3 — Expense Feature ✅
**Date:** 2026-03-20

### What we built
- Expense schema (Mongoose model) — defines shape of data in MongoDB
- `POST /expenses` — saves a new expense
- `GET /expenses` — returns all saved expenses

### Files created
| File | What it does |
|------|-------------|
| `backend/src/expenses/expense.schema.ts` | Mongoose schema — defines amount, merchant, category, rawMessage, date fields |
| `backend/src/expenses/expenses.service.ts` | Business logic — create() and findAll() methods |
| `backend/src/expenses/expenses.controller.ts` | HTTP routes — POST and GET /expenses |
| `backend/src/expenses/expenses.module.ts` | Ties schema + service + controller together |

### API Endpoints
| Method | URL | What it does |
|--------|-----|-------------|
| POST | `/expenses` | Save a new expense |
| GET | `/expenses` | Get all expenses |

### Example POST body
```json
{
  "amount": 450,
  "merchant": "Zomato",
  "category": "Food",
  "rawMessage": "Spent 450 Zomato"
}
```

### How to test (PowerShell)
```powershell
# Save expense
Invoke-RestMethod -Method POST -Uri http://localhost:3000/expenses -ContentType "application/json" -Body '{"amount": 450, "merchant": "Zomato", "category": "Food", "rawMessage": "Spent 450 Zomato"}'

# Get all expenses
Invoke-RestMethod -Uri http://localhost:3000/expenses
```

---

## What comes next — Step 4
Connect Groq AI to parse natural language:
- User sends "Spent ₹450 Zomato"
- AI extracts: amount=450, merchant=Zomato, category=Food
- Auto-saves to MongoDB

---
