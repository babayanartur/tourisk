import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(currentFile), "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

for (const relativePath of [".cache"]) {
  const target = path.join(root, relativePath);
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

console.log("Устанавливаю backend-зависимости Tourisk из публичного npm registry...");
const result = spawnSync(
  npmCommand,
  ["install", "--registry=https://registry.npmjs.org/", "--no-audit", "--no-fund"],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      npm_config_registry: "https://registry.npmjs.org/",
    },
  }
);

process.exit(result.status ?? 1);
