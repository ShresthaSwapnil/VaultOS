# How to Run VaultOS (Cross-Platform Guide)

VaultOS is configured to start its entire ecosystem of services (Next.js web app, Python sidecar, n8n engine, and OpenClaw) with a single command on both **macOS/Linux** and **Windows**.

---

## 📋 Prerequisites & Setup

Before starting, ensure you have:
1. **Node.js** (v18 or higher)
2. **Python 3.9+**
3. **n8n** installed globally (`n8n` command available in terminal/cmd)
4. **OpenClaw** installed globally (`openclaw` command available in terminal/cmd)

### Setting up the Python Virtual Environment
Follow the commands matching your operating system inside the project root folder:

#### 🍎 macOS / Linux
```bash
python3 -m venv sidecar/.venv
./sidecar/.venv/bin/pip install -r sidecar/requirements.txt
```

#### 🪟 Windows
```powershell
python -m venv sidecar\.venv
.\sidecar\.venv\Scripts\pip.exe install -r sidecar\requirements.txt
```

---

## 🚀 The Single-Command Launch (Recommended)

To launch **everything** (Next.js, Python Sidecar, n8n, OpenClaw) concurrently with unified, color-coded logging:

```bash
# From the project root, run:
npm run dev
```

*This automatically spins up:*
1. **OpenClaw** Agent framework (detects LaunchAgent/services or runs headless)
2. **n8n** Automation engine
3. **FastAPI Python Sidecar** on `http://127.0.0.1:8001` (filesystem watchdog + Hamrobazar scraper)
4. **Next.js Web Frontend** on `http://localhost:3000`

*To stop all services safely, press `Ctrl + C` in the terminal. The dev runner handles graceful terminations for all child processes on both platforms.*

---

## 🛠️ Step-by-Step Manual Guide (Alternative)

If you prefer to run services individually in separate terminal sessions:

### 1. Start the Python Sidecar
*   **macOS / Linux**:
    ```bash
    ./sidecar/.venv/bin/python sidecar/main.py
    ```
*   **Windows**:
    ```powershell
    .\sidecar\.venv\Scripts\python.exe sidecar\main.py
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
openclaw gateway run
```

---

## 🔍 Diagnostics & Ports

| Component | Default Port | Health URL |
| :--- | :--- | :--- |
| **Next.js Web App** | `3000` | `http://localhost:3000` |
| **Python Sidecar** | `8001` | `http://127.0.0.1:8001/health` |
| **n8n Engine** | `5678` | `http://localhost:5678` |
| **OpenClaw** | `18789`/`8000` | Websocket / API endpoint |
