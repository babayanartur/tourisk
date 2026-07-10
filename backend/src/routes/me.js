import express from "express";
import { authRequired } from "../middleware/auth.js";
import { Achievement } from "../models/GameContent.js";
import { applyProgress, normalizeUser } from "../utils/game.js";

export const meRouter = express.Router();

meRouter.use(authRequired);

meRouter.get("/", async (req, res) => {
  return res.json({ user: normalizeUser(req.user) });
});

meRouter.patch("/", async (req, res) => {
  const nickname = String(req.body.nickname || "").trim();
  const selectedPawn = String(req.body.selectedPawn || "").trim();

  if (nickname) req.user.nickname = nickname.slice(0, 40);
  if (selectedPawn) req.user.selectedPawn = selectedPawn.slice(0, 80);

  await req.user.save();
  return res.json({ user: normalizeUser(req.user) });
});

meRouter.post("/location", async (req, res) => {
  const latitude = Number(req.body.latitude);
  const longitude = Number(req.body.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ message: "Некорректная геолокация" });
  }

  const achievements = await Achievement.find({ isActive: true }).lean();
  const progress = applyProgress(req.user, {
    latitude,
    longitude,
    cellId: req.body.cellId,
    city: req.body.city,
    country: req.body.country,
    source: req.body.source,
  }, achievements);

  await req.user.save();

  req.app.get("io")?.emit("tourisk:location", {
    userId: req.user._id.toString(),
    nickname: req.user.nickname,
    latitude,
    longitude,
    xp: req.user.xp,
    cellId: progress.cellId,
  });

  return res.json({
    ok: true,
    isNewCell: progress.isNewCell,
    cellId: progress.cellId,
    unlockedAchievements: progress.unlocked,
    user: normalizeUser(req.user),
  });
});
