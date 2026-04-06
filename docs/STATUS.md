# RupeePilot — Current Status
**Last updated:** 2026-03-26
**Release target:** 2026-03-28

---

## Project Summary

RupeePilot is a personal finance assistant for Indian professionals. Users log expenses and investments by sending natural language messages to a Telegram bot. A web dashboard (Google login) shows charts, budget tracking, and investment insights.

**Stack:** NestJS backend · Next.js 14 frontend · MongoDB · Groq AI (llama-3.3-70b) · Telegram bot · NextAuth v5 (Google OAuth)

**Repo:** https://github.com/sarankumar0/RupeePilot

---

## What Is Built (Completed)

### Core Infrastructure
- NestJS backend on port 3000, MongoDB connected
- Next.js frontend on port 3001, Google OAuth login via NextAuth v5
- Users saved to MongoDB on first login, synced via `POST /users/sync`
- Telegram bot (@rupeepilot_bot) running in polling mode

### Expense Tracking
- Telegram bot parses natural language → Groq AI extracts amount, merchant, category
- 11 categories: Food, Transport, Shopping, Entertainment, Health, Utilities, Housing, EMI, Learning, Others (+ Investment routed separately)
- **Learning category** added — covers AI tools (Claude, Cursor, ChatGPT), courses (Udemy, Coursera), professional software across all professions (dev, finance, law, design, medical)
- Budget alerts via Telegram: ⚠️ 80% warning, 🚨 exceeded at 100%
- Weekly AI report every Sunday 8 PM IST — includes week total, vs last week, category breakdown, biggest expense, AI tip

### Investment Tracking (separate from expenses)
- Separate `investments` MongoDB collection — never mixed with expense data
- Investment types: Stock, ETF, Bond, SIP/MF, Gold, FD, Other
- Fields stored: amount, type, name, quantity, avgPrice (per unit), telegramUserId, date
- **Smart Telegram flow** — AI detects investment messages, starts a conversation:
  - All data in one message ("Bought 10 Tata Motors 150 per stock") → saved directly, no questions
  - Quantity known, price missing ("15 stocks on ONGC") → asks only for price (single number)
  - Price ambiguous ("Bought ONGC at 165") → asks both price + qty together (can't assume per-unit vs total)
  - No data ("Bought ONGC shares") → full confirm → type selection → price+qty flow
- **Platform transfer rejection** — "2000 for Zerodha / 500 to Groww" → bot says "Log after actual purchase, not platform deposit"
- Investment goal: user sets target % of salary to invest monthly (default 20%)

### Web Dashboard
- **Sidebar navigation** — Desktop: fixed left sidebar (w-56) with logo, Dashboard + Investments links, user info, theme toggle, sign out. Mobile: bottom nav bar.
- **Light/Dark theme** — toggle persists to localStorage via next-themes. Default: light.
- **Dashboard page** (`/dashboard`) — expense stats, category charts, recent expenses, Telegram link setup, budget + income setter
- **Investments page** (`/investments`) — goal progress bar, diversification pie chart, monthly vs all-time stats, savings rate, investment history list, investment goal setter (% slider)
- **Landing page** (`/`) — light, colorful, orange accents, marketing page with features + CTA
- **Login page** (`/login`) — light gradient, Google sign-in button
- **Onboarding** — after first login, collects income, salary date, budget before showing dashboard

### Account Setup
- Telegram linking via 6-char magic code (generated on dashboard, typed in bot)
- `salaryDate` field on User — day of month salary arrives (1–31), for future salary-cycle calculations
- `onboardingDone` flag — gates dashboard until onboarding complete
- `investmentGoalPercent` field on User (default 20%)

---

## Current File Structure

```
backend/src/
├── ai/               ai.service.ts — Groq parsing (expense + investment detection)
├── expenses/         expense schema, service, controller
├── investments/      investment schema, service, controller, module  ← NEW
├── telegram/         telegram.service.ts — bot + investment state machine
├── users/            user schema, service, controller (income, budget, salary date, investment goal)
└── app.module.ts

frontend/src/
├── app/
│   ├── page.tsx               Landing page
│   ├── login/page.tsx         Login page
│   ├── onboarding/            Onboarding flow
│   ├── dashboard/             Dashboard page + components
│   └── investments/           Investments page + components  ← NEW
├── components/
│   ├── Sidebar.tsx            ← NEW — shared sidebar nav
│   ├── ThemeProvider.tsx
│   └── ThemeToggle.tsx
└── auth.ts
```

---

## Telegram Bot — Current Message Flows

### Expense flow (default)
```
User: "Spent 450 at Zomato"
Bot:  "⏳ Parsing..."
Bot:  "✅ Saved! ₹450 · Zomato · Food"
      [Budget alert if near/over limit]
```

### Investment flow — complete data
```
User: "Bought 10 Tata Motors 150 per stock"
Bot:  "✅ Investment logged! 10 units × ₹150 = ₹1,500"
```

### Investment flow — partial (qty known)
```
User: "15 stocks on ONGC"
Bot:  "Got 15 units of ONGC. What was the avg price per unit?"
User: "165"
Bot:  "✅ Logged! 15 units × ₹165 = ₹2,475"
```

### Investment flow — ambiguous price
```
User: "Bought ONGC at 165"
Bot:  "Got ONGC — ₹165 mentioned. Share avg price per unit and units. Example: 165 10"
User: "165 10"
Bot:  "✅ Logged! 10 units × ₹165 = ₹1,650"
```

### Investment flow — SIP/MF
```
User: "SIP 5000"
Bot:  "⏳ Parsing..." → detects Investment
Bot:  "Investment or expense? 1/2"
User: "1"
Bot:  "What type? 1. Stock 2. SIP/MF 3. Other"
User: "2"
Bot:  "✅ Logged! SIP/MF ₹5,000"
```

### Platform transfer rejection
```
User: "2000 for Zerodha"
Bot:  "We don't track platform deposits. Log after you actually buy a stock/MF/ETF."
```

---

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| POST | `/users/sync` | Create/find user after Google login |
| GET | `/users/:googleId` | Get user profile |
| POST | `/users/:googleId/budget` | Set monthly budget |
| POST | `/users/:googleId/income` | Set monthly income |
| POST | `/users/:googleId/onboarding` | Complete onboarding (income + salaryDate + budget) |
| POST | `/users/:googleId/investment-goal` | Set investment goal % |
| POST | `/users/:googleId/generate-link-code` | Generate Telegram link code |
| GET | `/expenses?telegramUserId=X` | Get user's expenses |
| GET | `/expenses/summary?telegramUserId=X` | Monthly stats + category breakdown |
| POST | `/investments` | Save investment |
| GET | `/investments?telegramUserId=X` | Get user's investments |
| GET | `/investments/summary?telegramUserId=X` | Monthly + all-time investment summary |

---

## What Is Left — Deploy (March 28 target)

| Task | Notes |
|------|-------|
| MongoDB Atlas | Move from local MongoDB to cloud |
| Railway | Deploy NestJS backend |
| Vercel | Deploy Next.js frontend |
| Telegram webhook | Switch from polling to webhook (required in production) |
| Google OAuth redirect URIs | Add production URL to Google Cloud Console |
| Environment variables | Set all secrets for production |

---

## Known Limitations / Future Improvements

- Salary-cycle aware calculations not yet implemented — "this month" uses calendar month, not salary date
- Investment portfolio value tracking (real-time stock prices) — Phase 2
- Onboarding flow exists in backend but frontend `/onboarding` page to be verified
- No push notifications beyond Telegram bot
- Bot runs in polling mode — needs webhook for production
