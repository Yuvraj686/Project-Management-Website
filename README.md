# TeamForge 🚀

> Real-time collaborative project management for engineering teams — powered by Gemini AI, FastAPI, and Next.js.

![TeamForge Banner](https://img.shields.io/badge/TeamForge-v1.0.0-6366f1?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688?style=flat-square&logo=fastapi)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?style=flat-square)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **JWT Auth** | Register/login with secure bcrypt + JWT |
| 🗂 **Project Management** | Create projects, tasks, deadlines, and team roles |
| 💬 **Real-time Chat** | WebSocket-powered group and private messaging |
| 🤖 **AI Review** | Gemini-powered architecture reviews and gap analysis |
| ⏰ **Deadline Warnings** | AI-generated sprint plans when deadlines approach |
| 🔀 **GitHub Webhooks** | AI-summarised push and pull request diffs |
| 🖥 **VS Code Extension** | Auto-tracks file saves and posts diffs to the changelog |
| 📁 **S3 File Storage** | Drag-and-drop asset uploads via AWS S3 |
| 📜 **Smart Changelog** | Unified view of GitHub + VS Code changes |
| 📧 **Email Alerts** | SendGrid deadline notifications |

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 + TailwindCSS |
| Backend | Python FastAPI + Uvicorn |
| Database | PostgreSQL (Supabase) |
| Cache / WebSocket | Redis (Upstash) |
| AI | Google Gemini 2.5 Flash |
| File Storage | AWS S3 |
| Email | SendGrid |
| Auth | JWT (python-jose) |

---

## 📁 Project Structure

```
teamforge/
├── .env.example              ← Copy to .env and fill values
├── backend/                  ← FastAPI Python backend
│   ├── main.py
│   ├── config.py             ← All settings via pydantic-settings
│   ├── database.py           ← Async SQLAlchemy engine
│   ├── models/               ← ORM models
│   ├── schemas/              ← Pydantic request/response schemas
│   ├── routers/              ← API endpoints
│   ├── services/             ← AI, S3, Redis, email, scheduler
│   └── middleware/           ← JWT auth middleware
├── frontend/                 ← Next.js 14 frontend
│   ├── pages/                ← Login, Dashboard, Chat, Changelog, AI Review
│   ├── components/           ← Layout, Sidebar, ChatWindow, AIChatBot, etc.
│   ├── lib/                  ← Axios client, WebSocket helper, auth utils
│   └── styles/               ← Global CSS with Tailwind
└── vscode-extension/         ← VS Code file-save tracker
    ├── extension.js
    └── package.json
```

---

## 🚀 Getting Started

### 1. Clone & Configure

```bash
git clone <your-repo-url>
cd teamforge

# Copy the environment template
cp .env.example .env
```

### 2. Fill in `.env`

Edit `.env` with your credentials:

```env
# Required — generate a random 32-char string:
APP_SECRET_KEY=<random_32_chars>

# PostgreSQL — Supabase free tier: https://supabase.com
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME

# Redis — Upstash free tier: https://upstash.com
REDIS_URL=rediss://default:PASSWORD@HOST:PORT

# Anthropic — get a key at https://console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-...

# AWS S3 — https://aws.amazon.com/s3/
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_NAME=teamforge-uploads
AWS_S3_REGION=us-east-1

# SendGrid — https://sendgrid.com (100 free emails/day)
SENDGRID_API_KEY=SG....
EMAIL_FROM=noreply@yourdomain.com

# GitHub webhook secret — generate with: openssl rand -hex 20
GITHUB_WEBHOOK_SECRET=...

# JWT
JWT_SECRET=<another_random_secret>
```

---

### 3. Run the Backend

```bash
cd backend

# Create & activate virtual environment
python -m venv venv
.\venv\Scripts\activate   # Windows
# or: source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Copy .env to backend directory (or adjust paths)
cp ../.env .env

# Start the server
uvicorn main:app --reload --port 8000
```

The API will be live at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

---

### 4. Run the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create local env file
cp .env.local.example .env.local
# Edit .env.local:
#   NEXT_PUBLIC_API_URL=http://localhost:8000
#   NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Start dev server
npm run dev
```

Frontend will be live at `http://localhost:3000`.

---

### 5. Install the VS Code Extension

```bash
cd vscode-extension
npm install

# Option A: Development mode
# Open the vscode-extension folder in VS Code and press F5

# Option B: Package and install
npm run package
code --install-extension teamforge-1.0.0.vsix
```

Then in VS Code:
1. `Ctrl+Shift+P` → **TeamForge: Set Project ID** → enter your project ID
2. `Ctrl+Shift+P` → **TeamForge: Set Auth Token** → paste your JWT token

---

## 🔗 GitHub Webhook Setup

1. Go to your GitHub repo → **Settings → Webhooks → Add webhook**
2. **Payload URL**: `https://your-backend.railway.app/webhooks/github`
3. **Content type**: `application/json`
4. **Secret**: the value of `GITHUB_WEBHOOK_SECRET` in your `.env`
5. **Events**: choose "Push" and "Pull requests"
6. Click **Add webhook**

---

## 🌐 Deployment

### Backend — Railway (Free tier: $5 credit/month)

1. Create an account at [railway.app](https://railway.app)
2. New project → **Deploy from GitHub repo** → select backend folder
3. Set all environment variables from your `.env` in the Railway dashboard
4. Set **Start command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Frontend — Vercel (Free hobby tier)

1. Create an account at [vercel.com](https://vercel.com)
2. Import your GitHub repo → set **Root Directory** to `frontend`
3. Add environment variables:
   - `NEXT_PUBLIC_API_URL=https://your-backend.railway.app`
   - `NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app`
4. Deploy!

---

## 💰 Free Tier Summary

| Service | Free Limit |
|---------|-----------|
| Supabase PostgreSQL | 500 MB storage |
| Upstash Redis | 10,000 req/day |
| AWS S3 | 5 GB + 20K GET + 2K PUT (12 months) |
| SendGrid | 100 emails/day |
| Railway | $5 credit ≈ 500 hours |
| Vercel | Unlimited hobby deployments |
| Gemini API | 1,500 req is Free forever |

---

## 📚 API Reference

The full interactive API docs are available at `http://localhost:8000/docs` (Swagger UI) or `http://localhost:8000/redoc` (ReDoc).

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get JWT token |
| GET | `/projects` | List your projects |
| POST | `/projects` | Create project |
| WS | `/ws/chat/{room_id}?token=...` | Real-time chat |
| POST | `/ai/review` | AI project review |
| POST | `/ai/deadline-warning` | AI deadline warning |
| GET | `/changelog/{project_id}` | Changelog entries |
| POST | `/files/upload` | Upload to S3 |
| POST | `/webhooks/github` | GitHub webhook |
| POST | `/webhooks/vscode` | VS Code extension webhook |

---

## 🛠 Development Tips

- **Alembic migrations**: `alembic init alembic` then `alembic revision --autogenerate -m "init"`
- **Type checking**: the backend uses full type hints throughout
- **Fresh DB**: tables are auto-created on startup via `Base.metadata.create_all`
- **Redis not available?**: set `REDIS_URL=redis://localhost:6379` and run Redis locally with Docker:
  ```bash
  docker run -d -p 6379:6379 redis:alpine
  ```

---

*Built with ❤️ using Gemini · TeamForge v1.0.0*
