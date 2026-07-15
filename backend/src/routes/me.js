import express from "express";
import { authRequired } from "../middleware/auth.js";
import { Achievement, Pawn, Place } from "../models/GameContent.js";
import { User } from "../models/User.js";
import { applyProgress, getProgressValue, normalizeUser, unlockAchievements, updateActivityStreak } from "../utils/game.js";

export const meRouter = express.Router();
meRouter.use(authRequired);

async function getGameContext() {
  const places = await Place.find({ isActive: true }).lean();
  const placesById = new Map(places.map((place) => [place.id, place]));
  const yerevanTotal = places.filter((place) => String(place.city || "").toLowerCase().includes("ереван")).length;
  return { places, placesById, yerevanTotal };
}

meRouter.get("/", async (req, res) => {
  return res.json({ user: normalizeUser(req.user, { includePrivate: true }) });
});

meRouter.patch("/", async (req, res) => {
  const nickname = String(req.body.nickname || "").trim();
  const selectedPawn = String(req.body.selectedPawn || "").trim();

  if (nickname) req.user.nickname = nickname.slice(0, 40);
  if (selectedPawn) {
    const pawn = await Pawn.findOne({ id: selectedPawn, isActive: true }).lean();
    if (!pawn) return res.status(422).json({ message: "Фигурка не найдена или выключена" });
    const context = await getGameContext();
    const current = getProgressValue(req.user, pawn.unlockType, context);
    if (current < Number(pawn.unlockValue || 0)) {
      return res.status(403).json({ message: "Эта фигурка ещё не открыта" });
    }
    req.user.selectedPawn = selectedPawn.slice(0, 80);
  }

  await req.user.save();
  return res.json({ user: normalizeUser(req.user, { includePrivate: true }) });
});

meRouter.post("/location", async (req, res) => {
  const latitude = Number(req.body.latitude);
  const longitude = Number(req.body.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ message: "Некорректная геолокация" });
  }

  const [achievements, context] = await Promise.all([
    Achievement.find({ isActive: true }).lean(),
    getGameContext(),
  ]);
  const progress = applyProgress(req.user, {
    latitude,
    longitude,
    cellId: req.body.cellId,
    cellIds: Array.isArray(req.body.cellIds) ? req.body.cellIds : undefined,
    city: req.body.city,
    country: req.body.country,
    source: req.body.source,
  }, achievements, context);

  await req.user.save();

  req.app.get("io")?.emit("tourisk:location", {
    userId: req.user._id.toString(),
    nickname: req.user.nickname,
    latitude,
    longitude,
    xp: req.user.xp,
    cellId: progress.cellId,
    cellIds: progress.cellIds,
  });

  return res.json({
    ok: true,
    isNewCell: progress.isNewCell,
    cellId: progress.cellId,
    cellIds: progress.cellIds,
    distanceDelta: progress.distanceDelta,
    unlockedAchievements: progress.unlocked,
    user: normalizeUser(req.user, { includePrivate: true }),
  });
});

meRouter.post("/discoveries/:placeId", async (req, res) => {
  const place = await Place.findOne({ id: String(req.params.placeId || ""), isActive: true }).lean();
  if (!place) return res.status(404).json({ message: "Место не найдено" });

  const xpReward = Math.max(0, Number(place.xp || 0));
  const rewardedUser = await User.findOneAndUpdate(
    { _id: req.user._id, openedPlaces: { $ne: place.id } },
    {
      $addToSet: { openedPlaces: place.id },
      $inc: {
        xp: xpReward,
        coins: Math.max(1, Math.round(xpReward / 5)),
        stars: Math.max(1, Math.round(xpReward / 4)),
      },
    },
    { new: true }
  );

  const alreadyOpened = !rewardedUser;
  const user = rewardedUser || await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "Пользователь не найден" });

  updateActivityStreak(user);
  const [achievements, context] = await Promise.all([
    Achievement.find({ isActive: true }).lean(),
    getGameContext(),
  ]);
  const unlocked = unlockAchievements(user, achievements, context);
  await user.save();

  req.app.get("io")?.emit("tourisk:discovery", {
    userId: user._id.toString(),
    placeId: place.id,
    xp: user.xp,
    alreadyOpened,
  });

  return res.json({
    ok: true,
    alreadyOpened,
    place,
    unlockedAchievements: unlocked,
    user: normalizeUser(user, { includePrivate: true }),
  });
});
