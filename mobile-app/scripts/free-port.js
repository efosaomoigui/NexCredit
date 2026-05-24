/**
 * free-port.js — Robust port release for Expo / Metro dev server
 *
 * Strategy (in order):
 *  1. Kill any node process whose command line references "expo" + "--port <PORT>"
 *  2. Kill any process listening on the TCP port (catches non-Expo occupants)
 *  3. Wait up to 2 seconds for the port to fully drain (TIME_WAIT)
 */

const { execSync, spawnSync } = require("child_process");

const PORT = Number(process.argv[2] || "9000");

if (!Number.isInteger(PORT) || PORT <= 0 || PORT > 65535) {
  console.error(`[free-port] Invalid port: ${process.argv[2]}`);
  process.exit(1);
}

// ── Helper: run a command silently, return stdout or "" ──────────────────────
function run(cmd) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

// ── Helper: kill a PID (force) ───────────────────────────────────────────────
function kill(pid) {
  if (!pid || !/^\d+$/.test(String(pid))) return false;
  const result = spawnSync("taskkill", ["/PID", String(pid), "/F"], {
    stdio: "ignore",
  });
  return result.status === 0;
}

// ── Step 1: Find node/Expo processes referencing our port ────────────────────
function killExpoProcesses() {
  const killed = [];

  // WMI query for node processes with our port in the command line
  const wmiOut = run(
    `wmic process where "name='node.exe'" get ProcessId,CommandLine /format:csv 2>nul`
  );

  for (const line of wmiOut.split(/\r?\n/)) {
    // Match any of: --port 9000 | --port=9000
    if (new RegExp(`--port[= ]${PORT}(\\s|$)`).test(line) || 
        new RegExp(`expo`).test(line) && line.includes(String(PORT))) {
      const parts = line.split(",");
      const pid = parts[parts.length - 1]?.trim();
      if (pid && /^\d+$/.test(pid) && pid !== "0") {
        if (kill(pid)) {
          killed.push(pid);
          console.log(`[free-port] Stopped Expo process PID ${pid} (was using port ${PORT})`);
        }
      }
    }
  }

  return killed;
}

// ── Step 2: Kill any remaining TCP LISTENING process on the port ─────────────
function killListening() {
  const killed = [];
  const out = run(`netstat -ano -p tcp | findstr /R /C:":${PORT} .*LISTENING"`);

  const pids = new Set();
  for (const line of out.split(/\r?\n/).filter(Boolean)) {
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && /^\d+$/.test(pid) && pid !== "0") pids.add(pid);
  }

  for (const pid of pids) {
    if (kill(pid)) {
      killed.push(pid);
      console.log(`[free-port] Killed TCP LISTENING process PID ${pid} on port ${PORT}`);
    }
  }

  return killed;
}

// ── Step 3: Wait for port to drain (up to 2000ms) ───────────────────────────
function waitForDrain(maxMs = 2000) {
  const step = 200;
  let elapsed = 0;

  while (elapsed < maxMs) {
    const out = run(`netstat -ano -p tcp | findstr /C:":${PORT} "`);
    // Port is clean when no LISTENING or ESTABLISHED lines remain
    const hasOccupant = out.split(/\r?\n/).some((l) => {
      const s = l.trim();
      return s.includes(`0.0.0.0:${PORT}`) || s.includes(`127.0.0.1:${PORT}`);
    });
    if (!hasOccupant) {
      console.log(`[free-port] Port ${PORT} is free. ✓`);
      return;
    }

    // Busy-wait using synchronous sleep
    const start = Date.now();
    while (Date.now() - start < step) {} // eslint-disable-line no-empty
    elapsed += step;
  }

  console.warn(`[free-port] Port ${PORT} may still be draining — proceeding anyway.`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
(function main() {
  const expoKilled = killExpoProcesses();
  const tcpKilled = killListening();

  if (expoKilled.length === 0 && tcpKilled.length === 0) {
    console.log(`[free-port] Port ${PORT} already free — nothing to do.`);
  }

  waitForDrain(2000);
})();
