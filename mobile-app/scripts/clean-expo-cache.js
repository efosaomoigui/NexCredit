const fs = require("fs");
const path = require("path");
const os = require("os");

function removePath(target) {
  try {
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
      console.log(`[clean-expo] Removed: ${target}`);
    }
  } catch (error) {
    console.warn(`[clean-expo] Could not remove ${target}: ${error.message}`);
  }
}

function main() {
  const projectRoot = process.cwd();
  const tempDir = os.tmpdir();

  removePath(path.join(projectRoot, ".expo"));
  removePath(path.join(projectRoot, ".metro-cache"));

  // Best-effort cleanup for stale Metro cache files on Windows/macOS/Linux temp dirs.
  try {
    const entries = fs.readdirSync(tempDir, { withFileTypes: true });
    for (const entry of entries) {
      const name = entry.name.toLowerCase();
      if (name.includes("metro") || name.includes("haste-map")) {
        removePath(path.join(tempDir, entry.name));
      }
    }
  } catch (error) {
    console.warn(`[clean-expo] Temp cache scan skipped: ${error.message}`);
  }

  console.log("[clean-expo] Done.");
}

main();

