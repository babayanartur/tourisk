import express from "express";
import { Achievement, AppConfig, Pawn, Place } from "../models/GameContent.js";
import { serializeContentItem } from "../utils/publicAsset.js";

export const gameRouter = express.Router();

gameRouter.get("/content", async (req, res) => {
  const [achievements, pawns, places, appConfigDoc] = await Promise.all([
    Achievement.find({ isActive: true }).sort({ sortOrder: 1, conditionValue: 1, createdAt: 1 }).lean(),
    Pawn.find({ isActive: true }).sort({ sortOrder: 1, unlockValue: 1, createdAt: 1 }).lean(),
    Place.find({ isActive: true }).sort({ sortOrder: 1, xp: -1, createdAt: 1 }).lean(),
    AppConfig.findOne({ key: "public" }).lean(),
  ]);

  return res.json({
    achievements: achievements.map((item) => serializeContentItem(req, item)),
    pawns: pawns.map((item) => serializeContentItem(req, item)),
    places: places.map((item) => serializeContentItem(req, item)),
    appConfig: appConfigDoc?.value || {},
    contentVersion: Math.max(
      0,
      ...achievements.map((item) => new Date(item.updatedAt || 0).getTime()),
      ...pawns.map((item) => new Date(item.updatedAt || 0).getTime()),
      ...places.map((item) => new Date(item.updatedAt || 0).getTime())
    ),
  });
});
