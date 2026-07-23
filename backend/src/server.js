import cors from "cors";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import { config } from "./config.js";
import { adminRouter } from "./routes/admin.js";
import { adminAuthRouter } from "./routes/adminAuth.js";
import { authRouter } from "./routes/auth.js";
import { gameRouter } from "./routes/game.js";
import { leaderboardRouter } from "./routes/leaderboard.js";
import { meRouter } from "./routes/me.js";
import { bootstrapGameContent } from "./services/bootstrapGameContent.js";
import { isEmailDeliveryConfigured } from "./services/emailService.js";
import { uploadsRoot } from "./utils/publicAsset.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const adminDir = path.join(__dirname, "..", "admin");

for (const folder of ["pawns", "achievements", "places"]) {
  fs.mkdirSync(path.join(uploadsRoot, folder), { recursive: true });
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.set("trust proxy", true);
app.set("io", io);
app.disable("x-powered-by");
app.use(cors({ origin: "*", exposedHeaders: ["Content-Length", "ETag"] }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(
  "/uploads",
  express.static(uploadsRoot, {
    fallthrough: false,
    maxAge: config.nodeEnv === "production" ? "30d" : 0,
    immutable: config.nodeEnv === "production",
  })
);

app.get("/api/health", async (req, res) => {
  const dbState = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({
    ok: dbState === "connected",
    service: "tourisk-backend",
    database: dbState,
    uploads: fs.existsSync(uploadsRoot),
    emailDelivery: isEmailDeliveryConfigured() ? "configured" : "not_configured",
    time: new Date().toISOString(),
  });
});

app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/game", gameRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/admin/auth", adminAuthRouter);
app.use("/api/admin", adminRouter);
app.use("/admin", express.static(adminDir, { maxAge: 0 }));

app.get("/", (req, res) => res.redirect("/admin"));

app.use((error, req, res, next) => {
  console.error("Request error:", error);
  if (error?.code === 11000) {
    return res.status(409).json({ message: "Запись с таким ID уже существует" });
  }
  if (error?.name === "ValidationError") {
    return res.status(422).json({ message: error.message });
  }
  if (error?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "Изображение слишком большое. Максимум 12 МБ" });
  }
  return res.status(Number(error?.status || 500)).json({ message: error?.message || "Ошибка сервера" });
});

app.use((req, res) => {
  res.status(404).json({ message: `Маршрут не найден: ${req.method} ${req.path}` });
});

io.on("connection", (socket) => {
  socket.emit("tourisk:connected", { ok: true });
});

async function start() {
  await mongoose.connect(config.mongoUri);
  const content = await bootstrapGameContent();
  server.listen(config.port, "0.0.0.0", () => {
    console.log(`Tourisk backend: http://localhost:${config.port}`);
    console.log(`Tourisk admin:   http://localhost:${config.port}/admin`);
    console.log("Content ready:", content);
  });
}

start().catch((error) => {
  console.error("Backend start error:", error);
  process.exit(1);
});
