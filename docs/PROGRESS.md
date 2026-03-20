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

## What comes next — Step 3
Create the Expense feature:
- Expense schema (Mongoose model)
- POST endpoint to save an expense
- GET endpoint to list expenses

---
