import express from "express";
import { Achievement, AppConfig, Pawn, Place } from "../models/GameContent.js";

export const gameRouter = express.Router();

gameRouter.get("/content", async (req, res) => {
  const [achievements, pawns, places, appConfigDoc] = await Promise.all([
    Achievement.find({ isActive: true }).sort({ conditionValue: 1 }).lean(),
    Pawn.find({ isActive: true }).sort({ unlockValue: 1 }).lean(),
    Place.find({ isActive: true }).sort({ xp: -1 }).lean(),
    AppConfig.findOne({ key: "public" }).lean(),
  ]);

  return res.json({
    achievements,
    pawns,
    places,
    appConfig: appConfigDoc?.value || {},
  });
});
