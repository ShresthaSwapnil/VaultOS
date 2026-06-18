const { spawn } = require("child_process");
const path = require("path");
const net = require("net");

const colors = {
  reset: "\x1b[0m",
  system: "\x1b[36m", // Cyan
  next: "\x1b[34m", // Blue
  sidecar: "\x1b[32m", // Green
  n8n: "\x1b[33m", // Yellow
  openclaw: "\x1b[35m", // Magenta
};

const processes = [];
let isCleaningUp = false;

function isPortOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

function cleanupAndExit() {
  if (isCleaningUp) return;
  isCleaningUp = true;
  console.log(
    `\n${colors.system}[System] Shutting down all spawned services...${colors.reset}`,
  );

  for (const p of processes) {
    if (p.child && !p.child.killed) {
      console.log(
        `${colors.system}[System] Stopping spawned ${p.name} (PID: ${p.child.pid})...${colors.reset}`,
      );
      try {
        p.child.kill("SIGTERM");
      } catch (e) {
        // ignore
      }
    }
  }

  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

process.on("SIGINT", cleanupAndExit);
process.on("SIGTERM", cleanupAndExit);
process.on("exit", cleanupAndExit);

function startService(name, color, command, args = [], options = {}) {
  console.log(
    `${colors.system}[System] Starting ${name} using command: "${command} ${args.join(" ")}"...${colors.reset}`,
  );

  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    ...options,
  });

  processes.push({ name, child });

  child.stdout.on("data", (data) => {
    const text = data.toString().trim();
    if (!text) return;
    text.split("\n").forEach((line) => {
      console.log(`${color}[${name}]${colors.reset} ${line}`);
    });
  });

  child.stderr.on("data", (data) => {
    const text = data.toString().trim();
    if (!text) return;
    text.split("\n").forEach((line) => {
      console.error(`${color}[${name} ERR]${colors.reset} ${line}`);
    });
  });

  child.on("close", (code) => {
    if (!isCleaningUp) {
      console.log(
        `${colors.system}[System] ${name} process terminated with exit code ${code}.${colors.reset}`,
      );
      cleanupAndExit();
    }
  });

  child.on("error", (err) => {
    console.error(
      `${colors.system}[System ERR] Failed to start ${name}: ${err.message}${colors.reset}`,
    );
    cleanupAndExit();
  });
}

async function runAll() {
  // 1. OpenClaw Gateway (Port 18789 is typical on this setup)
  const openClawRunning = await isPortOpen(18789);
  if (openClawRunning) {
    console.log(
      `${colors.openclaw}[OpenClaw] Already running on port 18789 (system LaunchAgent service). Skipping startup.${colors.reset}`,
    );
  } else {
    // If not running, start the gateway server
    startService("OpenClaw", colors.openclaw, "openclaw", ["gateway", "run"]);
  }

  // 2. n8n Engine (Port 5678)
  const n8nRunning = await isPortOpen(5678);
  if (n8nRunning) {
    console.log(
      `${colors.n8n}[n8n] Already running on port 5678. Skipping startup.${colors.reset}`,
    );
  } else {
    startService("n8n", colors.n8n, "n8n");
  }

  // 3. Python Sidecar (Port 8001)
  const sidecarRunning = await isPortOpen(8001);
  if (sidecarRunning) {
    console.log(
      `${colors.sidecar}[Sidecar] Already running on port 8001. Skipping startup.${colors.reset}`,
    );
  } else {
    const sidecarPython = `"${path.resolve(__dirname, "sidecar", ".venv", "bin", "python")}"`;
    const sidecarScript = `"${path.resolve(__dirname, "sidecar", "main.py")}"`;
    startService("Sidecar", colors.sidecar, sidecarPython, [sidecarScript]);
  }

  // 4. Next.js Web App
  startService("Next.js", colors.next, "npm", ["run", "dev-next"]);
}

runAll();
