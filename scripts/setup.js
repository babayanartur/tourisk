const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const expoCache = path.join(root, ".expo");
if (fs.existsSync(expoCache)) fs.rmSync(expoCache, { recursive: true, force: true });

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const args = ["install", "--registry=https://registry.npmjs.org/", "--no-audit", "--no-fund"];

console.log("Устанавливаю зависимости Tourisk из публичного npm registry...");
const result = spawnSync(npmCommand, args, {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    npm_config_registry: "https://registry.npmjs.org/",
  },
});

process.exit(result.status ?? 1);
