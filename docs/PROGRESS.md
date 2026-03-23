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

## Step 4 — Groq AI Integration ✅
**Date:** 2026-03-22

### What we built
- `AiService` — calls Groq API with a structured prompt to extract expense fields from plain English
- `POST /expenses/parse` — accepts raw text, runs it through AI, auto-saves to MongoDB
- No manual field entry needed — just type naturally

### Files created
| File | What it does |
|------|-------------|
| `backend/src/ai/ai.service.ts` | Calls Groq API, extracts amount/merchant/category from raw text |
| `backend/src/ai/ai.module.ts` | Wraps AiService so other modules can use it |

### Model used
`llama-3.3-70b-versatile` via Groq API
> Note: `llama3-70b-8192` was decommissioned — always check `console.groq.com/docs/deprecations` for current models

### API Endpoint
| Method | URL | Body | Response |
|--------|-----|------|----------|
| POST | `/expenses/parse` | `{ "text": "Spent 450 at Zomato" }` | `{ parsed, expense }` |

### How to test (PowerShell)
```powershell
Invoke-RestMethod -Method POST -Uri http://localhost:3000/expenses/parse -ContentType "application/json" -Body '{"text": "Spent 450 at Zomato last night"}'
```

### Tested and verified ✅
- Input: `"Spent 450 at Zomato last night"`
- AI extracted: `{ amount: 450, merchant: "Zomato", category: "Food" }`
- Auto-saved to MongoDB with timestamps

### Important notes
- `GROQ_API_KEY` lives in `backend/.env` — never commit this file
- Always run server with `npm run start:dev` for auto-restart on file changes

---

## Step 5 — Telegram Bot ✅
**Date:** 2026-03-22

### What we built
- `TelegramService` — listens for messages via polling, parses expenses using AI, saves to MongoDB
- `/start` command — welcome message explaining how to use the bot
- Every expense saved includes `telegramUserId` so we know who sent it
- Bot replies with a confirmation after saving

### Files created
| File | What it does |
|------|-------------|
| `backend/src/telegram/telegram.service.ts` | Listens for Telegram messages, calls AiService and ExpensesService |
| `backend/src/telegram/telegram.module.ts` | Wraps TelegramService, imports ExpensesModule and AiModule |

### How it works
```
User sends "Spent 450 Zomato" on Telegram
  → TelegramService receives message
    → AiService extracts amount, merchant, category
      → ExpensesService saves to MongoDB with telegramUserId
        → Bot replies: "✅ Saved! ₹450 at Zomato (Food)"
```

### Important notes
- Uses polling mode (bot constantly asks Telegram for new messages)
- `telegramUserId` stored with every expense — identifies the user
- Bot token stored in `backend/.env` as `TELEGRAM_BOT_TOKEN`
- Find your bot on Telegram via: `t.me/your_bot_username`
- Always run with `npm run start:dev` for auto-restart

---

## Step 6 — Next.js Frontend + Google Login ✅
**Date:** 2026-03-23

### What we built
- Next.js 16 frontend with TypeScript + Tailwind CSS
- Google OAuth login via NextAuth.js v5
- Login page with "Sign in with Google" button
- Dashboard page — protected, shows welcome message and expense summary placeholders
- Auto-syncs user to MongoDB backend on first login

### Files created
| File | What it does |
|------|-------------|
| `frontend/src/auth.ts` | NextAuth config — Google provider, syncs user to backend on login |
| `frontend/src/app/api/auth/[...nextauth]/route.ts` | NextAuth API route handler |
| `frontend/src/app/login/page.tsx` | Login page with Google sign-in button |
| `frontend/src/app/dashboard/page.tsx` | Protected dashboard — redirects to login if not authenticated |
| `frontend/src/app/page.tsx` | Root page — redirects to /login |
| `frontend/.env.local` | Frontend secrets — never committed to GitHub |

### How to run frontend
```powershell
cd frontend
npm run dev -- --port 3001
```
Visit `http://localhost:3001`

### .env.local contents
```
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=rupeepilot-secret-change-in-production
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Google OAuth setup
- Project created in Google Cloud Console
- OAuth consent screen configured (External)
- Redirect URI: `http://localhost:3001/api/auth/callback/google`

---

## Step 7 — Users Collection ✅
**Date:** 2026-03-23

### What we built
- `User` Mongoose schema — stores Google account details + optional telegramUserId
- `POST /users/sync` — called automatically after Google login, creates user if first time
- `GET /users/:googleId` — fetch user profile
- `POST /users/:googleId/link-telegram` — links Telegram ID to Google account

### Files created
| File | What it does |
|------|-------------|
| `backend/src/users/user.schema.ts` | Mongoose schema — googleId, email, name, avatar, telegramUserId |
| `backend/src/users/users.service.ts` | findOrCreate, findByGoogleId, linkTelegram methods |
| `backend/src/users/users.controller.ts` | HTTP routes — sync, get, link-telegram |
| `backend/src/users/users.module.ts` | Wraps everything together |

### User schema fields
| Field | Type | Description |
|-------|------|-------------|
| googleId | string | Unique Google account ID |
| email | string | User's Gmail address |
| name | string | Full name from Google |
| avatar | string | Profile picture URL |
| telegramUserId | number | Linked after user connects Telegram |

### API Endpoints
| Method | URL | Description |
|--------|-----|-------------|
| POST | `/users/sync` | Save user after Google login |
| GET | `/users/:googleId` | Get user profile |
| POST | `/users/:googleId/link-telegram` | Link Telegram to Google account |

### How identity works
```
Google Login → googleId saved in MongoDB
Telegram Bot → telegramUserId saved with each expense
Link step    → telegramUserId added to User record
Dashboard    → fetch expenses by telegramUserId
```

---

## Step 7b — Telegram Account Linking ✅
**Date:** 2026-03-23

### What we built
- Magic code linking flow — user generates a code on the dashboard, types `/link <code>` in Telegram bot, accounts get connected
- Dashboard shows "Telegram Connected ✅" once linked
- Fixed CORS — backend now allows requests from `http://localhost:3001`
- Fixed googleId mismatch — session now carries the real Google ID (not NextAuth's internal UUID)

### Files changed
| File | What changed |
|------|-------------|
| `backend/src/users/user.schema.ts` | Added `linkCode` field |
| `backend/src/users/users.service.ts` | Added `generateLinkCode()` and `linkByCode()` methods |
| `backend/src/users/users.controller.ts` | Added `POST /users/:googleId/generate-link-code` endpoint |
| `backend/src/telegram/telegram.module.ts` | Imported UsersModule |
| `backend/src/telegram/telegram.service.ts` | Handles `/link <code>` command |
| `backend/src/main.ts` | Enabled CORS for `http://localhost:3001` |
| `frontend/src/auth.ts` | Fixed: save real Google ID in JWT via `jwt` callback, not `token.sub` |
| `frontend/src/app/dashboard/TelegramLink.tsx` | New client component — full link flow UI with bot link |
| `frontend/src/app/dashboard/page.tsx` | Fetches user profile, passes `isLinked` to TelegramLink |

### New API Endpoint
| Method | URL | Description |
|--------|-----|-------------|
| POST | `/users/:googleId/generate-link-code` | Generates a 6-char code, saves to user in MongoDB |

### How linking works
```
1. User clicks "Link Telegram" on dashboard
2. Backend generates code e.g. "XK7P2M", saves it on the user document
3. Dashboard shows: "Open Telegram and type /link XK7P2M"
4. User types /link XK7P2M in the bot
5. Bot finds user by code → saves telegramUserId → clears the code
6. Dashboard shows "Telegram Connected ✅"
```

### Bug fixed — googleId mismatch
NextAuth's `token.sub` is an internal UUID, not the Google user ID. Fixed by adding a `jwt` callback that saves `account.providerAccountId` (the real Google ID) into the token.

### Telegram bot link
`https://t.me/rupeepilot_bot`

---

## What comes next — Step 8: Dashboard with Real Data + Charts

- `GET /expenses?telegramUserId=xxx` — filter expenses by user
- `GET /expenses/summary?telegramUserId=xxx` — monthly total + category breakdown
- Replace ₹0 placeholder cards with real numbers
- Category breakdown chart using Recharts

---
