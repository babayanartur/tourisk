const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

function findLanAddress() {
  const interfaces = os.networkInterfaces();
  const preferredNames = ["en0", "en1", "Wi-Fi", "Ethernet"];
  const all = [];

  for (const [name, entries] of Object.entries(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      all.push({ name, address: entry.address });
    }
  }

  for (const name of preferredNames) {
    const match = all.find((item) => item.name === name);
    if (match) return match.address;
  }

  return all[0]?.address || "127.0.0.1";
}

function removeDirectory(relativePath) {
  const target = path.join(process.cwd(), relativePath);
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function resolveLocalExpoCli() {
  try {
    return require.resolve("expo/bin/cli");
  } catch {
    console.error("\nExpo не установлен локально.");
    console.error("Выполни: npm install");
    console.error("Затем: npm start\n");
    process.exit(1);
  }
}

removeDirectory(".expo");
removeDirectory("node_modules/.cache/metro");

const lanAddress = findLanAddress();
const apiUrl = process.env.EXPO_PUBLIC_API_URL || "https://back.tourisk.app/api";
const extraArgs = process.argv.slice(2);
const expoCli = resolveLocalExpoCli();
const args = [expoCli, "start", "--clear", "--lan", ...extraArgs];

console.log(`Tourisk API: ${apiUrl}`);
console.log("Запускаю локальный Expo SDK 54 без автоматической установки чужой версии.");

const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    EXPO_PUBLIC_API_URL: apiUrl,
  },
});

child.on("error", (error) => {
  console.error("Не удалось запустить Expo:", error.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
