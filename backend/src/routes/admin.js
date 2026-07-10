import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { adminRequired } from "../middleware/auth.js";
import { Achievement, AppConfig, Pawn, Place } from "../models/GameContent.js";
import { User } from "../models/User.js";
import { normalizeUser } from "../utils/game.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(path.join(uploadsRoot, "pawns"), { recursive: true });
fs.mkdirSync(path.join(uploadsRoot, "achievements"), { recursive: true });
fs.mkdirSync(path.join(uploadsRoot, "places"), { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const type = ["pawns", "achievements", "places"].includes(req.params.type) ? req.params.type : "pawns";
    const dir = path.join(uploadsRoot, type);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || ".png").toLowerCase() || ".png";
    const safe = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!file.mimetype?.startsWith("image/")) return cb(new Error("Можно загружать только изображения"));
    cb(null, true);
  },
});

export const adminRouter = express.Router();
adminRouter.use(adminRequired);

const RESOURCES = { achievements: Achievement, pawns: Pawn, places: Place };

adminRouter.get("/summary", async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [users, usersToday, achievements, pawns, places, topPlayers, recentUsers] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: today } }),
    Achievement.countDocuments(),
    Pawn.countDocuments(),
    Place.countDocuments(),
    User.find({ isBlocked: false }).sort({ xp: -1 }).limit(10),
    User.find().sort({ createdAt: -1 }).limit(10),
  ]);

  const allUsers = await User.find().select("visitedCells cities countries xp recentTrail updatedAt createdAt").lean();
  const totalCells = allUsers.reduce((sum, user) => sum + (user.visitedCells?.length || 0), 0);
  const totalXp = allUsers.reduce((sum, user) => sum + Number(user.xp || 0), 0);
  const totalCheckins = allUsers.reduce((sum, user) => sum + (user.recentTrail?.length || 0), 0);
  const countries = new Set(allUsers.flatMap((user) => user.countries || []).filter(Boolean)).size;
  const cities = new Set(allUsers.flatMap((user) => user.cities || []).filter(Boolean)).size;
  const activeToday = allUsers.filter((user) => user.updatedAt && new Date(user.updatedAt) >= today).length;

  return res.json({
    users,
    usersToday,
    activeToday,
    achievements,
    pawns,
    places,
    totalCells,
    totalXp,
    totalCheckins,
    exploredKm2: Number((totalCells * 0.01).toFixed(2)),
    countries,
    cities,
    topPlayers: topPlayers.map(normalizeUser),
    recentUsers: recentUsers.map(normalizeUser),
  });
});

adminRouter.post("/upload/:type", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Файл не загружен" });
  const type = ["pawns", "achievements", "places"].includes(req.params.type) ? req.params.type : "pawns";
  return res.status(201).json({ path: `/uploads/${type}/${req.file.filename}` });
});

adminRouter.get("/users", async (req, res) => {
  const users = await User.find().sort({ updatedAt: -1 }).limit(300);
  return res.json({ items: users.map(normalizeUser) });
});

adminRouter.patch("/users/:id", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "Пользователь не найден" });

  if (typeof req.body.isBlocked === "boolean") user.isBlocked = req.body.isBlocked;
  if (req.body.xp !== undefined) user.xp = Number(req.body.xp || 0);
  if (req.body.nickname) user.nickname = String(req.body.nickname).slice(0, 40);

  await user.save();
  return res.json({ item: normalizeUser(user) });
});

adminRouter.get("/config", async (req, res) => {
  const doc = await AppConfig.findOne({ key: "public" });
  return res.json({ item: doc?.value || {} });
});

adminRouter.put("/config", async (req, res) => {
  const doc = await AppConfig.findOneAndUpdate(
    { key: "public" },
    { $set: { value: req.body || {} } },
    { upsert: true, new: true }
  );
  return res.json({ item: doc.value });
});

Object.entries(RESOURCES).forEach(([name, Model]) => {
  adminRouter.get(`/${name}`, async (req, res) => {
    const items = await Model.find().sort({ createdAt: -1 }).lean();
    return res.json({ items });
  });

  adminRouter.post(`/${name}`, async (req, res) => {
    const body = sanitizeResourceBody(name, req.body);
    const item = await Model.create(body);
    return res.status(201).json({ item });
  });

  adminRouter.patch(`/${name}/:id`, async (req, res) => {
    const body = sanitizeResourceBody(name, req.body);
    const item = await Model.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: "Запись не найдена" });
    return res.json({ item });
  });

  adminRouter.delete(`/${name}/:id`, async (req, res) => {
    const item = await Model.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Запись не найдена" });
    return res.json({ ok: true });
  });
});

function sanitizeResourceBody(name, body) {
  const result = { ...body };
  ["conditionValue", "rewardXp", "unlockValue", "latitude", "longitude", "xp"].forEach((key) => {
    if (result[key] !== undefined && result[key] !== "") result[key] = Number(result[key]);
  });
  if (result.isActive === "true") result.isActive = true;
  if (result.isActive === "false") result.isActive = false;
  if (name === "pawns" && !result.imagePath) result.imagePath = "";
  return result;
}
