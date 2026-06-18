# How to Run VaultOS

VaultOS is configured to start its entire ecosystem of services (Next.js web app, Python sidecar, n8n engine, and OpenClaw) with a single command.

---

## 📋 Prerequisites

Before starting, ensure you have:
1. **Node.js** (v18 or higher)
2. **Python 3.9+** (with virtual environment configured at `sidecar/.venv`)
3. **n8n** installed globally/locally on path (`n8n` command available)
4. **OpenClaw** installed on path (`openclaw` command available)

---

## 🚀 The Single-Command Launch (Recommended)

To launch **everything** (Next.js, Python Sidecar, n8n, OpenClaw) concurrently with unified, color-coded logging:

```bash
# From the project root, run:
npm run dev
```

*This spins up:*
1. **OpenClaw** Agent framework
2. **n8n** Automation engine
3. **FastAPI Python Sidecar** on `http://127.0.0.1:8001` (filesystem watchdog + scraper)
4. **Next.js Web Frontend** on `http://localhost:3000`

To stop all services safely, simply press `Ctrl + C` in the terminal. The runner script automatically triggers graceful shutdowns for all children.

---

## 🛠️ Step-by-Step Manual Guide (Alternative)

If you prefer to run services individually in separate terminal sessions:

### 1. Start the Python Sidecar
```bash
./sidecar/.venv/bin/python sidecar/main.py
```

### 2. Start the Next.js Frontend
```bash
npm run dev-next
```

### 3. Start n8n
```bash
n8n
```

### 4. Start OpenClaw
```bash
openclaw
```

---

## 🔍 Diagnostics & Ports

| Component | Default Port | Health URL |
| :--- | :--- | :--- |
| **Next.js Web App** | `3000` | `http://localhost:3000` |
| **Python Sidecar** | `8001` | `http://127.0.0.1:8001/health` |
| **n8n Engine** | `5678` | `http://localhost:5678` |
| **OpenClaw** | `18789`/`8000` | Websocket / API endpoint |
