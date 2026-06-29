# 🌍 Language Companion — AI Language Tutor

A full-stack AI-powered language learning app. Chat in French, Spanish, German, Japanese, Italian, or Portuguese with an AI tutor that responds naturally and gently corrects your grammar.

**Powered by:** [Groq](https://groq.com) (ultra-fast LLM inference) + React frontend + Flask backend.

---

## ✨ Features

- 💬 **Real conversational AI** — Powered by Llama 3.3 70B via Groq for lightning-fast responses
- 🌍 **6 languages** — French, Spanish, German, Japanese, Italian, Portuguese
- ✏️ **Grammar correction** — Gentle, encouraging mistake explanations in English
- 🔄 **Live translation** — English summary of every AI reply
- 🎙️ **Voice input** — Speak in the target language using your browser mic
- 🎩 **Formal/informal mode** — Switch between tu/vous registers
- 💡 **Vocab tips** — Cultural and vocabulary insights per message
- 📊 **Session stats** — Track messages and corrections
- 🌓 **Dark mode** — Automatic via `prefers-color-scheme`
- 📱 **Mobile-friendly** — Responsive layout

---

## 🚀 Quick Start (Local)

### Prerequisites
- Python 3.10+
- Node.js 18+
- A [Groq API key](https://console.groq.com) (free tier available)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd language-companion

# Install Python dependencies
cd backend
pip install -r requirements.txt
cd ..

# Install Node dependencies
cd frontend
npm install
cd ..
```

### 2. Set your Groq API key

```bash
cd backend
cp .env.example .env
# Edit .env and add your key:
# GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```

### 3. Build the frontend

```bash
cd frontend
npm run build
cp -r dist ../backend/
cd ..
```

### 4. Run the app

```bash
cd backend
python app.py
```

Visit **http://localhost:5000** — both frontend and backend are served from Flask.

---

## 🛠️ Development Mode (hot reload)

Run backend and frontend separately for a faster development loop:

**Terminal 1 — Backend:**
```bash
cd backend
GROQ_API_KEY=your_key_here FLASK_ENV=development python app.py
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Visit **http://localhost:5173** (Vite proxies `/api` calls to Flask on port 5000).

---

## ☁️ Deploy to Render (free tier)

1. Push your code to a GitHub repo
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your repo
4. Set these:
   - **Build command:** `pip install -r backend/requirements.txt && cd frontend && npm install && npm run build && cp -r dist ../backend/`
   - **Start command:** `gunicorn backend.app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 60`
5. Add environment variable: `GROQ_API_KEY` = your key
6. Click **Deploy**

Your app will be live at `https://your-app-name.onrender.com` — shareable with anyone!

---

## ☁️ Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

railway login
railway init
railway add
# Set env var in Railway dashboard: GROQ_API_KEY

railway up
```

---

## 🐳 Docker

```bash
# Copy your key into .env
echo "GROQ_API_KEY=your_key_here" > .env

# Build and run everything
docker-compose up --build
```

- Frontend dev server: http://localhost:5173
- Backend API: http://localhost:5000

---

## 📁 Project Structure

```
language-companion/
├── backend/
│   ├── app.py              # Flask server + Groq API integration
│   ├── requirements.txt    # Python deps
│   └── .env.example        # Copy to .env and add your key
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React component
│   │   ├── App.module.css   # CSS Modules styles
│   │   ├── index.css        # Global styles + CSS variables
│   │   └── main.jsx         # React entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── render.yaml              # One-click Render deployment
├── docker-compose.yml       # Docker dev setup
├── Dockerfile.backend
├── Dockerfile.frontend
└── README.md
```

---

## 🔧 Customization

### Change the AI model
In `backend/app.py`, line with `model=`:
```python
# Groq-supported models (all very fast):
model="llama-3.3-70b-versatile"    # best quality (default)
model="llama-3.1-8b-instant"       # fastest, lighter
model="mixtral-8x7b-32768"         # large context window
model="gemma2-9b-it"               # Google Gemma 2
```

### Add a new language
In `backend/app.py`, add to `LANGUAGE_CONFIG`:
```python
"ko": {"name": "Korean", "flag": "🇰🇷", "speech_code": "ko-KR", "greeting": "안녕하세요"},
```

Then in `frontend/src/App.jsx`, add to `LANGUAGES` and `STARTERS`.

### Adjust the tutor personality
Edit `build_system_prompt()` in `backend/app.py` — the system prompt controls tone, correction style, and language register.

---

## 🔑 Getting a Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (free)
3. Create an API key under **API Keys**
4. Free tier includes generous limits for personal projects

---

## 🛡️ Notes

- The Groq API key is only used server-side — users never see it
- All conversation history is stored in the browser session only (no database)
- Voice input uses the browser's Web Speech API (works in Chrome/Edge; limited in Firefox/Safari)
