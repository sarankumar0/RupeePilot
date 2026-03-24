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

## Step 8 — Dashboard with Real Expense Data + Charts ✅
**Date:** 2026-03-23

### What we built
- `GET /expenses?telegramUserId=xxx` — filter expenses by user
- `GET /expenses/summary?telegramUserId=xxx` — monthly total, category breakdown, top category
- Dashboard shows real data when Telegram is linked — stat cards + category bar chart
- Recent expenses list (last 10)
- Category bar chart using Recharts with color-coded bars per category

### Files changed
| File | What changed |
|------|-------------|
| `backend/src/expenses/expenses.service.ts` | Added `findByUser()` and `getSummary()` methods |
| `backend/src/expenses/expenses.controller.ts` | Updated GET /expenses to accept `?telegramUserId`, added `/summary` endpoint |
| `frontend/src/app/dashboard/ExpenseSummary.tsx` | New client component — stat cards + Recharts bar chart + recent list |
| `frontend/src/app/dashboard/page.tsx` | Server component fetches summary + expenses, conditionally renders chart |

---

## Step 9 — Budget Alerts ✅
**Date:** 2026-03-23

### What we built
- User sets a monthly budget limit on the dashboard
- After every expense saved via Telegram, bot automatically checks budget usage
- ⚠️ Warning sent at 80% — shows remaining amount
- 🚨 Alert sent at 100% — budget exceeded message

### Files changed
| File | What changed |
|------|-------------|
| `backend/src/users/user.schema.ts` | Added `monthlyBudget` field (default 0) |
| `backend/src/users/users.service.ts` | Added `setBudget()` method |
| `backend/src/users/users.controller.ts` | Added `POST /users/:googleId/budget` endpoint |
| `backend/src/telegram/telegram.service.ts` | Added `checkBudgetAlert()` — called after every expense save |
| `frontend/src/app/dashboard/BudgetSetter.tsx` | New client component — ₹ input + Save button |
| `frontend/src/app/dashboard/page.tsx` | Renders BudgetSetter when Telegram is linked |

### How it works
```
User saves expense via Telegram bot
  → checkBudgetAlert() runs
    → Loads user's monthlyBudget from MongoDB
      → Gets thisMonthTotal from ExpensesService
        → If spent >= 80% → send ⚠️ warning
        → If spent >= 100% → send 🚨 exceeded alert
```

---

## Step 10 — AI Parsing Improvements ✅
**Date:** 2026-03-23

### Problem
AI was failing to parse Indian natural language patterns:
- "Earphone 50" — item first, no explicit "spent"
- "220 for dress" — amount first
- "Spent 50 to buy boat earphones" — item described in sentence

### Fix
Rewrote the Groq prompt with:
- Detailed category rules with Indian examples (petrol, auto, tiffin, etc.)
- 7 concrete input → output examples
- Explicit rule: if no clear merchant, use the item being bought as merchant name

### File changed
| File | What changed |
|------|-------------|
| `backend/src/ai/ai.service.ts` | Completely rewrote the prompt with examples and Indian context rules |

---

## Step 11 — Weekly AI Summary + Income Tracking ✅
**Date:** 2026-03-24

### What we built
- User sets monthly income on dashboard (alongside budget)
- Every Sunday at 8 PM IST, bot sends a full weekly report to all linked users
- Report includes: this week's total, vs last week comparison, this month total vs budget and income, category breakdown, biggest expense, heaviest day, AI-generated tip

### Files changed
| File | What changed |
|------|-------------|
| `backend/src/users/user.schema.ts` | Added `monthlyIncome` field |
| `backend/src/users/users.service.ts` | Added `setIncome()`, `findAllLinked()` methods |
| `backend/src/users/users.controller.ts` | Added `POST /users/:googleId/income` endpoint |
| `backend/src/expenses/expenses.service.ts` | Added `getWeekSummary()` — this week, last week, biggest expense, heaviest day |
| `backend/src/ai/ai.service.ts` | Added `generateWeeklyTip()` — 1-line personalised saving tip via Groq |
| `backend/src/telegram/telegram.service.ts` | Added `sendWeeklyReport()` + node-cron job (every Sunday 8 PM IST) |
| `frontend/src/app/dashboard/BudgetSetter.tsx` | Extended to include income input — side-by-side budget + income fields |

### Weekly report format
```
📊 Weekly Report — Mar 17–23

💸 This week: ₹4,800
📈 vs last week: +₹800 (+20%)

📅 This month so far: ₹11,200
⚠️ Monthly budget: ₹11,200 / ₹25,000 (44% used)
💼 Monthly income: ₹40,000 → 28% spent so far

📂 Category Breakdown:
  🍔 Food          ₹1,800 (37%)
  🛍 Shopping      ₹1,200 (25%)
  ...

🔺 Biggest: ₹1,200 at Amazon
📆 Heaviest day: Saturday

💡 Tip: Try home tiffin 3 days a week to save ₹500–₹800/month.
```

### Cron schedule
`30 14 * * 0` → Every Sunday 14:30 UTC = 8:00 PM IST

---

## Step 12 — Full Dashboard Redesign ✅
**Date:** 2026-03-24

### What we built
Complete rewrite of the dashboard UI with multi-column layout, interactive charts, and smart insights.

### Layout (top → bottom)
1. Telegram link status
2. Monthly Finance Settings (income + budget side by side)
3. **5 stat cards** — This Month / Budget % / Income % / Saved This Month / Top Category
4. **Category filter pills** — filters all charts when clicked
5. **Main chart (2/3) + Insights sidebar (1/3)**
   - Main chart: Day / Week / Month toggle with date picker
   - Day view: category breakdown bar chart for selected day
   - Week view: daily totals Mon–Sun for selected week
   - Month view: daily totals for every day of selected month
   - Insights sidebar: 30-day trend line, weekday vs weekend average, heaviest day of week, all-time total
6. **Comparison chart** — compare any two days / weeks / months side by side per category
7. **Recent expenses** — date picker (default today) + merchant search + day total

### New features vs previous dashboard
| Feature | Before | After |
|---------|--------|-------|
| Stat cards | 3 cards | 5 cards including savings + income % |
| Chart | Static all-time category bar | Interactive Day/Week/Month with date picker |
| Category filter | None | Pills that filter all charts |
| Trend | None | 30-day sparkline |
| Spend insights | None | Weekend vs weekday, heaviest day |
| Comparison | None | Any two periods side by side |
| Recent expenses | Last 10, no filter | Filterable by date + searchable |

### Files changed
| File | What changed |
|------|-------------|
| `frontend/src/app/dashboard/ExpenseSummary.tsx` | Complete rewrite — all new features |
| `frontend/src/app/dashboard/page.tsx` | Passes `monthlyBudget` + `monthlyIncome` to ExpenseSummary, reordered layout |

---

## Step 13 — Investment Tracking ✅
**Date:** 2026-03-24

### What we built
- `Investment` is now a first-class category — distinct from regular spending
- Groq AI recognises investment messages: SIP, mutual funds, stocks, Zerodha, Groww, ETF, gold, crypto, PPF, NPS
- Dashboard stat cards split into: **Spent** / **Invested** / **Budget Used** / **Free Cash** / **Top Category**
- Savings rate = (invested + free cash) / income — shown as subtitle on Free Cash card
- Budget % is calculated against spending only — investments don't count against the budget

### Why this matters
Lumping investments into expenses made savings look worse than reality. Now the user can see:
- How much they actually *spent* (bad money going out)
- How much they *invested* (good money working for them)
- How much *free cash* remains (unallocated income)

### How to log investments via Telegram
```
"SIP 5000"                    → Investment, ₹5000, merchant: SIP
"invested 10000 in zerodha"   → Investment, ₹10000, merchant: Zerodha
"mutual fund 3000"            → Investment, ₹3000, merchant: Mutual Fund
"bought gold 2000"            → Investment, ₹2000, merchant: Gold
```

### Files changed
| File | What changed |
|------|-------------|
| `backend/src/ai/ai.service.ts` | Added `Investment` to category list with SIP/stocks/ETF/PPF examples |
| `backend/src/expenses/expenses.service.ts` | `getSummary()` now returns `thisMonthInvested`; `topCategory` excludes Investment |
| `frontend/src/app/dashboard/ExpenseSummary.tsx` | New stat cards (Spent / Invested / Budget Used / Free Cash / Top Category); Investment color + emoji added |

### Stat card logic
| Card | Formula |
|------|---------|
| Spent This Month | thisMonthTotal − thisMonthInvested |
| Invested | thisMonthInvested (from Investment category) |
| Budget Used | (Spent / monthlyBudget) × 100 |
| Free Cash | monthlyIncome − thisMonthTotal; subtitle shows savings rate % |
| Top Category | Highest spend category, Investment excluded |

---

## What comes next — Step 14: Deploy

- MongoDB Atlas — move from local MongoDB to cloud
- Railway — deploy NestJS backend
- Vercel — deploy Next.js frontend
- Switch Telegram bot from polling → webhook mode (required for production)
- Update environment variables for production URLs

---
