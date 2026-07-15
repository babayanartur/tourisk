import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { adminRequired } from "../middleware/auth.js";
import { Achievement, AppConfig, Pawn, Place } from "../models/GameContent.js";
import { User } from "../models/User.js";
import { normalizeUser } from "../utils/game.js";
import { deleteManagedUpload, serializeContentItem, toPublicAssetUrl, uploadsRoot } from "../utils/publicAsset.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
fs.mkdirSync(path.join(uploadsRoot, "pawns"), { recursive: true });
fs.mkdirSync(path.join(uploadsRoot, "achievements"), { recursive: true });
fs.mkdirSync(path.join(uploadsRoot, "places"), { recursive: true });

const ALLOWED_UPLOAD_TYPES = new Set(["pawns", "achievements", "places"]);
const EXT_BY_MIME = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const type = String(req.params.type || "");
    if (!ALLOWED_UPLOAD_TYPES.has(type)) return cb(Object.assign(new Error("Неизвестный тип изображения"), { status: 400 }));
    const dir = path.join(uploadsRoot, type);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = EXT_BY_MIME[file.mimetype];
    if (!ext) return cb(Object.assign(new Error("Поддерживаются PNG, JPG и WEBP"), { status: 415 }));
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    if (!EXT_BY_MIME[file.mimetype]) return cb(Object.assign(new Error("Поддерживаются PNG, JPG и WEBP"), { status: 415 }));
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

  const allUsers = await User.find().select("visitedCells cities countries xp recentTrail updatedAt createdAt isBlocked").lean();
  const totalCells = allUsers.reduce((sum, user) => sum + (user.visitedCells?.length || 0), 0);
  const totalXp = allUsers.reduce((sum, user) => sum + Number(user.xp || 0), 0);
  const totalCheckins = allUsers.reduce((sum, user) => sum + (user.recentTrail?.length || 0), 0);
  const countries = new Set(allUsers.flatMap((user) => user.countries || []).filter(Boolean)).size;
  const cities = new Set(allUsers.flatMap((user) => user.cities || []).filter(Boolean)).size;
  const activeToday = allUsers.filter((user) => user.updatedAt && new Date(user.updatedAt) >= today).length;
  const blockedUsers = allUsers.filter((user) => user.isBlocked).length;
  const averageXp = users ? Math.round(totalXp / users) : 0;

  const dayFormatter = new Intl.DateTimeFormat("ru-RU", { weekday: "short" });
  const dateKey = (value) => {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const activityLast7Days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return {
      key: dateKey(date),
      label: dayFormatter.format(date).replace(".", ""),
      registrations: 0,
      active: 0,
    };
  });
  const trendByDay = new Map(activityLast7Days.map((item) => [item.key, item]));

  allUsers.forEach((user) => {
    if (user.createdAt) {
      const day = trendByDay.get(dateKey(user.createdAt));
      if (day) day.registrations += 1;
    }
    if (user.updatedAt) {
      const day = trendByDay.get(dateKey(user.updatedAt));
      if (day) day.active += 1;
    }
  });

  const countryCounts = new Map();
  allUsers.forEach((user) => {
    (user.countries || []).forEach((country) => {
      if (!country) return;
      countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
    });
  });
  const topCountries = Array.from(countryCounts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return res.json({
    users,
    usersToday,
    activeToday,
    blockedUsers,
    averageXp,
    activityLast7Days,
    topCountries,
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
  const type = String(req.params.type || "");
  if (!ALLOWED_UPLOAD_TYPES.has(type)) return res.status(400).json({ message: "Неизвестный тип изображения" });
  const imagePath = `/uploads/${type}/${req.file.filename}`;
  return res.status(201).json({ path: imagePath, url: toPublicAssetUrl(req, imagePath) });
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
    const items = await Model.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
    return res.json({ items: items.map((item) => serializeContentItem(req, item)) });
  });

  adminRouter.post(`/${name}`, async (req, res) => {
    const body = sanitizeResourceBody(name, req.body);
    if (name === "pawns" && !body.imagePath && !body.imageUrl) {
      return res.status(422).json({ message: "Для фигурки нужно загрузить изображение" });
    }
    let item;
    try {
      item = await Model.create(body);
    } catch (error) {
      deleteManagedUpload(body.imagePath);
      throw error;
    }
    req.app.get("io")?.emit("tourisk:content-updated", { resource: name, action: "created", id: item.id });
    return res.status(201).json({ item: serializeContentItem(req, item) });
  });

  adminRouter.patch(`/${name}/:id`, async (req, res) => {
    const body = sanitizeResourceBody(name, req.body);
    const previous = await Model.findById(req.params.id);
    if (!previous) return res.status(404).json({ message: "Запись не найдена" });

    const previousImage = previous.imagePath || "";
    Object.assign(previous, body);
    try {
      await previous.save();
    } catch (error) {
      if (body.imagePath && body.imagePath !== previousImage) deleteManagedUpload(body.imagePath);
      throw error;
    }

    if (body.imagePath && previousImage && previousImage !== body.imagePath) {
      deleteManagedUpload(previousImage);
    }
    req.app.get("io")?.emit("tourisk:content-updated", { resource: name, action: "updated", id: previous.id });
    return res.json({ item: serializeContentItem(req, previous) });
  });

  adminRouter.delete(`/${name}/:id`, async (req, res) => {
    const item = await Model.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Запись не найдена" });
    deleteManagedUpload(item.imagePath);
    req.app.get("io")?.emit("tourisk:content-updated", { resource: name, action: "deleted", id: item.id });
    return res.json({ ok: true });
  });
});

function sanitizeResourceBody(name, body) {
  const allowed = {
    achievements: ["id", "title", "description", "icon", "imagePath", "conditionType", "conditionValue", "rewardXp", "sortOrder", "isActive"],
    pawns: ["id", "name", "description", "imageUrl", "imagePath", "glowColor", "mapScale", "rarity", "unlockType", "unlockValue", "condition", "sortOrder", "isActive"],
    places: ["id", "name", "description", "icon", "city", "country", "latitude", "longitude", "rarity", "xp", "discoveryRadiusMeters", "imagePath", "sortOrder", "isActive"],
  };
  const result = {};
  for (const key of allowed[name] || []) {
    if (body?.[key] !== undefined) result[key] = body[key];
  }

  ["conditionValue", "rewardXp", "unlockValue", "latitude", "longitude", "xp", "discoveryRadiusMeters", "sortOrder", "mapScale"].forEach((key) => {
    if (result[key] !== undefined && result[key] !== "") result[key] = Number(result[key]);
  });
  if (result.isActive === "true") result.isActive = true;
  if (result.isActive === "false") result.isActive = false;
  if (result.id !== undefined) result.id = String(result.id).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  if (result.imagePath && !String(result.imagePath).startsWith("/uploads/")) delete result.imagePath;
  return result;
}
