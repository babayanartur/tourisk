import express from "express";
import { authRequired } from "../middleware/auth.js";
import { Achievement, Pawn, Place } from "../models/GameContent.js";
import { User } from "../models/User.js";
import { applyProgress, getProgressValue, normalizeUser, unlockAchievements, updateActivityStreak } from "../utils/game.js";
import { mutateDocumentById } from "../utils/userMutation.js";

export const meRouter = express.Router();
meRouter.use(authRequired);

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

async function getGameContext() {
  const places = await Place.find({ isActive: true }).lean();
  const placesById = new Map(places.map((place) => [place.id, place]));
  const yerevanTotal = places.filter((place) => String(place.city || "").toLowerCase().includes("ереван")).length;
  return { places, placesById, yerevanTotal };
}

meRouter.get("/", asyncRoute(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "Пользователь не найден" });
  return res.json({ user: normalizeUser(user, { includePrivate: true }) });
}));

meRouter.patch("/", asyncRoute(async (req, res) => {
  const nickname = String(req.body.nickname || "").trim();
  const selectedPawn = String(req.body.selectedPawn || "").trim();
  const pawn = selectedPawn
    ? await Pawn.findOne({ id: selectedPawn, isActive: true }).lean()
    : null;

  if (selectedPawn && !pawn) {
    return res.status(422).json({ message: "Фигурка не найдена или выключена" });
  }

  const context = selectedPawn ? await getGameContext() : null;
  const { document: user } = await mutateDocumentById(User, req.user._id, async (freshUser) => {
    if (nickname) freshUser.nickname = nickname.slice(0, 40);
    if (pawn) {
      const current = getProgressValue(freshUser, pawn.unlockType, context);
      if (current < Number(pawn.unlockValue || 0)) {
        const error = new Error("Эта фигурка ещё не открыта");
        error.status = 403;
        throw error;
      }
      freshUser.selectedPawn = selectedPawn.slice(0, 80);
    }
  });

  return res.json({ user: normalizeUser(user, { includePrivate: true }) });
}));

meRouter.post("/location", asyncRoute(async (req, res) => {
  const latitude = Number(req.body.latitude);
  const longitude = Number(req.body.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ message: "Некорректная геолокация" });
  }

  const [achievements, context] = await Promise.all([
    Achievement.find({ isActive: true }).lean(),
    getGameContext(),
  ]);

  const payload = {
    latitude,
    longitude,
    cellId: req.body.cellId,
    cellIds: Array.isArray(req.body.cellIds) ? req.body.cellIds : undefined,
    city: req.body.city,
    country: req.body.country,
    source: req.body.source,
    speedMps: req.body.speedMps,
    accuracy: req.body.accuracy,
    transportMode: req.body.transportMode,
    timestamp: req.body.timestamp,
  };

  const { document: user, result: progress } = await mutateDocumentById(
    User,
    req.user._id,
    async (freshUser) => applyProgress(freshUser, payload, achievements, context),
    { maxAttempts: 6, notFoundMessage: "Пользователь не найден" }
  );

  req.app.get("io")?.emit("tourisk:location", {
    userId: user._id.toString(),
    nickname: user.nickname,
    latitude,
    longitude,
    xp: user.xp,
    cellId: progress.cellId,
    cellIds: progress.cellIds,
    xpDelta: progress.xpDelta,
    transportMode: progress.transportMode,
  });

  return res.json({
    ok: true,
    isNewCell: progress.isNewCell,
    cellId: progress.cellId,
    cellIds: progress.cellIds,
    distanceDelta: progress.distanceDelta,
    xpDelta: progress.xpDelta,
    explorationReward: progress.explorationReward,
    explorationBlocked: progress.explorationBlocked,
    transportMode: progress.transportMode,
    speedMps: progress.speedMps,
    unlockedAchievements: progress.unlocked,
    user: normalizeUser(user, { includePrivate: true }),
  });
}));

meRouter.post("/discoveries/:placeId", asyncRoute(async (req, res) => {
  const place = await Place.findOne({ id: String(req.params.placeId || ""), isActive: true }).lean();
  if (!place) return res.status(404).json({ message: "Место не найдено" });

  const [achievements, context] = await Promise.all([
    Achievement.find({ isActive: true }).lean(),
    getGameContext(),
  ]);

  const { document: user, result } = await mutateDocumentById(
    User,
    req.user._id,
    async (freshUser) => {
      freshUser.openedPlaces = Array.isArray(freshUser.openedPlaces) ? freshUser.openedPlaces : [];
      const alreadyOpened = freshUser.openedPlaces.includes(place.id);
      const xpBefore = Number(freshUser.xp || 0);

      if (!alreadyOpened) {
        const xpReward = Math.max(0, Number(place.xp || 0));
        freshUser.openedPlaces.push(place.id);
        freshUser.xp = xpBefore + xpReward;
        freshUser.coins = Number(freshUser.coins || 0) + Math.max(1, Math.round(xpReward / 5));
        freshUser.stars = Number(freshUser.stars || 0) + Math.max(1, Math.round(xpReward / 4));
      }

      updateActivityStreak(freshUser);
      const unlocked = unlockAchievements(freshUser, achievements, context);
      return { alreadyOpened, xpBefore, unlocked };
    },
    { maxAttempts: 6, notFoundMessage: "Пользователь не найден" }
  );

  req.app.get("io")?.emit("tourisk:discovery", {
    userId: user._id.toString(),
    placeId: place.id,
    xp: user.xp,
    alreadyOpened: result.alreadyOpened,
  });

  return res.json({
    ok: true,
    alreadyOpened: result.alreadyOpened,
    place,
    xpDelta: result.alreadyOpened ? 0 : Math.max(0, Number(user.xp || 0) - result.xpBefore),
    unlockedAchievements: result.unlocked,
    user: normalizeUser(user, { includePrivate: true }),
  });
}));
