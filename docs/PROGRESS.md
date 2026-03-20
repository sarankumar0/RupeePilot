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

## What comes next — Step 2
Set up the NestJS backend:
- Initialise the NestJS project inside `backend/`
- Connect to MongoDB
- Create a health-check endpoint to verify everything works

---
