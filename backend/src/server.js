import cors from "cors";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import { config } from "./config.js";
import { adminRouter } from "./routes/admin.js";
import { adminAuthRouter } from "./routes/adminAuth.js";
import { authRouter } from "./routes/auth.js";
import { gameRouter } from "./routes/game.js";
import { leaderboardRouter } from "./routes/leaderboard.js";
import { meRouter } from "./routes/me.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const adminDir = path.join(__dirname, "..", "admin");
const uploadsDir = path.join(__dirname, "..", "uploads");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.set("io", io);
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "tourisk-backend", time: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/game", gameRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/admin/auth", adminAuthRouter);
app.use("/api/admin", adminRouter);
app.use("/admin", express.static(adminDir));

app.get("/", (req, res) => res.redirect("/admin"));

app.use((error, req, res, next) => {
  console.error("Request error:", error);
  return res.status(500).json({ message: error.message || "Ошибка сервера" });
});

app.use((req, res) => {
  res.status(404).json({ message: `Маршрут не найден: ${req.method} ${req.path}` });
});

io.on("connection", (socket) => {
  socket.emit("tourisk:connected", { ok: true });
});

async function start() {
  await mongoose.connect(config.mongoUri);
  server.listen(config.port, () => {
    console.log(`Tourisk backend: http://localhost:${config.port}`);
    console.log(`Tourisk admin:   http://localhost:${config.port}/admin`);
  });
}

start().catch((error) => {
  console.error("Backend start error:", error);
  process.exit(1);
});
