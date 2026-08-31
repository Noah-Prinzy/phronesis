# PHRONESIS: SETUP & INSTALLATION GUIDE

**Status:** Complete local development setup  
**Target:** Get Phronesis running locally in 30 minutes  
**Prerequisites:** Node.js v18+, Git, npm v9+

---

## 🎯 QUICK START (TL;DR)

```bash
# 1. Clone repo
git clone https://github.com/Noah-Prinzy/phronesis.git
cd phronesis

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# 4. Run locally
npm run dev

# 5. Open browser
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
```

That's it! Now read the detailed sections below.

---

## ✅ PREREQUISITES

### **1. Install Node.js (v18+)**

**Check if already installed:**
```bash
node --version
# Should show v18.0.0 or higher
```

**If not installed:**
- Download: https://nodejs.org/
- Choose LTS version
- Install with defaults
- Verify: `node --version`

### **2. Install Git**

**Check if already installed:**
```bash
git --version
# Should show git version 2.x or higher
```

**If not installed:**
- Download: https://git-scm.com/
- Install with defaults

### **3. Text Editor (Choose one)**

- **VS Code** (recommended) — https://code.visualstudio.com/
- **WebStorm** — https://www.jetbrains.com/webstorm/
- **Sublime Text** — https://www.sublimetext.com/

### **4. Command Line / Terminal**

- **Windows:** PowerShell or Git Bash
- **Mac:** Terminal (built-in)
- **Linux:** Terminal (built-in)

---

## 📦 STEP 1: CLONE REPOSITORY

### **Clone via HTTPS (easier):**

```bash
git clone https://github.com/Noah-Prinzy/phronesis.git
cd phronesis
```

### **OR Clone via SSH (if GitHub SSH key setup):**

```bash
git clone git@github.com:Noah-Prinzy/phronesis.git
cd phronesis
```

### **Verify clone:**

```bash
ls -la
# Should see:
# - frontend/
# - backend/
# - docs/
# - README.md
# - package.json
```

---

## 🛠️ STEP 2: INSTALL DEPENDENCIES

### **Install root dependencies:**

```bash
npm install
```

This installs dependencies listed in `/package.json` (if monorepo root exists).

### **Install frontend dependencies:**

```bash
cd frontend
npm install
```

**Expected output:**
```
added 250+ packages
```

### **Install backend dependencies:**

```bash
cd ../backend
npm install
```

**Expected output:**
```
added 150+ packages
```

### **Verify installations:**

```bash
# From phronesis/frontend/
npm ls react
# Should show: react@18.x.x

# From phronesis/backend/
npm ls express
# Should show: express@4.x.x
```

---

## 🔑 STEP 3: ENVIRONMENT VARIABLES

### **What you need:**

Create `.env.local` files in both frontend and backend directories.

### **Frontend: `frontend/.env.local`**

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=eyJhbGc... (your anon key)

# Backend API
VITE_API_URL=http://localhost:3000

# Optional: Analytics
VITE_VERCEL_ANALYTICS_ID=

# Environment
VITE_ENV=development
```

### **Backend: `backend/.env`**

```env
# Server
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJhbGc... (your service_role key)
SUPABASE_DB_URL=postgresql://...

# Claude API
CLAUDE_API_KEY=sk-ant-... (from anthropic.com)

# OpenAI (optional, for fallback)
OPENAI_API_KEY=sk-... (from openai.com)

# Google Services
GOOGLE_MAPS_API_KEY=...
GOOGLE_CLOUD_PROJECT_ID=...
GOOGLE_TTS_API_KEY=...

# Session
SESSION_SECRET=your-secret-key-min-32-chars

# CORS
CORS_ORIGIN=http://localhost:5173

# Email (SendGrid)
SENDGRID_API_KEY=SG... (optional)

# Environment
LOG_LEVEL=debug
```

### **Where to get API keys:**

#### **Supabase (Required)**
1. Go to: https://supabase.com
2. Sign up / Log in
3. Create new project
4. Copy URL from Settings → API
5. Copy Anon Key for frontend
6. Copy Service Role Key for backend

#### **Claude API (Required)**
1. Go to: https://console.anthropic.com
2. Sign up / Log in
3. Go to API Keys
4. Create new key
5. Copy to `.env`

#### **Google Maps (Required for Phase 2)**
1. Go to: https://console.cloud.google.com
2. Create new project
3. Enable Maps API
4. Create API key
5. Copy to `.env`

#### **OpenAI (Optional, for fallback)**
1. Go to: https://platform.openai.com
2. Sign up / Log in
3. Go to API Keys
4. Create new key

---

## ▶️ STEP 4: RUN LOCALLY

### **Option A: Run Frontend Only (Recommended for Week 1)**

```bash
cd phronesis/frontend
npm run dev
```

**Output:**
```
VITE v4.x.x build ready in 123ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

### **Option B: Run Both Frontend & Backend**

**Terminal 1 (Frontend):**
```bash
cd phronesis/frontend
npm run dev
# Runs on http://localhost:5173
```

**Terminal 2 (Backend):**
```bash
cd phronesis/backend
npm run dev
# Runs on http://localhost:3000
```

### **Option C: Run with Docker (Advanced)**

```bash
docker-compose up
# Runs frontend + backend in containers
```

---

## 🌐 STEP 5: ACCESS LOCALLY

### **Frontend:**
- URL: http://localhost:5173
- Open in browser
- You should see the Phronesis app (or Welcome screen in Week 2)

### **Backend:**
- URL: http://localhost:3000
- Not for browsing (JSON API)
- Test with curl or Postman:

```bash
curl http://localhost:3000/api/health
# Should return: {"status": "ok"}
```

### **DevTools:**
- Open browser → F12
- Console tab (for errors)
- Network tab (for API calls)

---

## 📝 STEP 6: VERIFY SETUP

### **Checklist:**

```bash
# 1. Node.js installed?
node --version
# ✅ Should be v18+

# 2. Repo cloned?
ls phronesis/
# ✅ Should show frontend/, backend/, docs/

# 3. Dependencies installed?
cd phronesis/frontend && npm list | head -10
# ✅ Should show packages installed

# 4. .env files created?
ls phronesis/frontend/.env.local
ls phronesis/backend/.env
# ✅ Both files should exist

# 5. Frontend running?
cd phronesis/frontend && npm run dev
# ✅ Should see "Local: http://localhost:5173/"

# 6. Backend running? (in another terminal)
cd phronesis/backend && npm run dev
# ✅ Should see "Server running on port 3000"
```

---

## 🏗️ PROJECT STRUCTURE

```
phronesis/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Avatar/
│   │   │   │   ├── Avatar.tsx (MAIN)
│   │   │   │   ├── Avatar.module.css
│   │   │   │   └── avatarAnimations.ts
│   │   │   └── ...other components
│   │   ├── pages/
│   │   │   ├── Welcome.tsx
│   │   │   ├── SignIn.tsx
│   │   │   ├── SignUp.tsx
│   │   │   ├── Home.tsx
│   │   │   └── Account.tsx
│   │   ├── App.tsx (main app)
│   │   ├── main.tsx (entry point)
│   │   └── index.css
│   ├── public/ (static files)
│   ├── .env.local (secrets)
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   └── chat.ts
│   │   ├── sockets/
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── ai.service.ts (Claude API)
│   │   │   └── auth.service.ts
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   ├── app.ts (Express app)
│   │   └── index.ts (server entry)
│   ├── .env (secrets)
│   ├── package.json
│   └── tsconfig.json
│
├── docs/
│   ├── README.md (this folder's guide)
│   ├── PHRONESIS_APP_PLAN_COMPLETE.md
│   ├── PHRONESIS_FINANCIAL_REPORT.md
│   ├── PHRONESIS_PHASE1_HACKATHON_SPRINT.md
│   ├── PHASE1_AVATAR_BUILD_GUIDE.md
│   ├── API_DOCUMENTATION.md
│   └── DEPLOYMENT_GUIDE.md
│
├── README.md (project overview)
└── package.json (root)
```

---

## 🚀 COMMON COMMANDS

### **Frontend:**

```bash
cd phronesis/frontend

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Lint code
npm run lint

# Format code
npm run format
```

### **Backend:**

```bash
cd phronesis/backend

# Start dev server with hot reload
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start

# Run tests
npm run test

# Lint code
npm run lint
```

---

## 🐛 TROUBLESHOOTING

### **Problem: "Port 3000 already in use"**

```bash
# Solution: Kill process on port 3000
# macOS/Linux:
lsof -i :3000
kill -9 <PID>

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### **Problem: "Cannot find module 'react'"**

```bash
# Solution: Reinstall node_modules
rm -rf node_modules package-lock.json
npm install
```

### **Problem: "VITE_SUPABASE_URL is undefined"**

```bash
# Solution: Check .env.local file
cat frontend/.env.local
# Should show VITE_SUPABASE_URL=...
# If not, create it (see Step 3)
```

### **Problem: "localhost:5173 won't load"**

```bash
# Solution: Check if frontend is running
cd frontend && npm run dev

# If still doesn't work:
# 1. Check browser console (F12)
# 2. Check terminal for errors
# 3. Try http://127.0.0.1:5173 instead
```

### **Problem: "CLAUDE_API_KEY is invalid"**

```bash
# Solution: Verify API key format
# Should start with: sk-ant-
# Get new key from: https://console.anthropic.com/account/keys
# Update backend/.env
```

### **Problem: TypeScript errors on npm run dev**

```bash
# Solution: Install TypeScript types
npm install --save-dev @types/node @types/express @types/react

# Then restart dev server
npm run dev
```

---

## 📚 ADDITIONAL RESOURCES

### **Official Docs:**
- React: https://react.dev
- Node.js: https://nodejs.org/docs/
- Express: https://expressjs.com/
- Supabase: https://supabase.com/docs
- Tailwind CSS: https://tailwindcss.com/docs
- Framer Motion: https://www.framer.com/motion/

### **Learning:**
- VS Code Getting Started: https://code.visualstudio.com/docs/introvideos/basics
- Git Basics: https://git-scm.com/doc
- REST APIs: https://developer.mozilla.org/en-US/docs/Glossary/REST

### **Tools:**
- Postman (API testing): https://www.postman.com/
- DevTools (Chrome): https://developer.chrome.com/docs/devtools/

---

## ✅ SETUP COMPLETE!

When you can:

1. ✅ Run `npm run dev` in frontend
2. ✅ See http://localhost:5173 load
3. ✅ Open DevTools with no errors
4. ✅ Run `npm run dev` in backend
5. ✅ See http://localhost:3000/api/health return `{"status": "ok"}`

**You're ready to start building!**

---

## 🎓 NEXT STEPS

1. ✅ Setup complete (you are here)
2. → Read: `/docs/PHASE1_AVATAR_BUILD_GUIDE.md`
3. → Build: Avatar component (Week 1-2)
4. → Test: Avatar demo page locally
5. → Continue: Rest of Phase 1

---

## 💬 GETTING HELP

If you get stuck:

1. **Check troubleshooting section above**
2. **Read error message carefully** (usually tells you the problem)
3. **Google the error** (other developers have seen it)
4. **Ask in the team** (other developers on the project)
5. **Check documentation** in `/docs/`

---

**Setup Date:** [Your date]  
**Status:** ✅ Ready to build  
**Next:** Read PHASE1_AVATAR_BUILD_GUIDE.md and start coding!
