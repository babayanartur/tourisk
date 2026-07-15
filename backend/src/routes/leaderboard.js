import express from "express";
import { User } from "../models/User.js";
import { normalizeUser } from "../utils/game.js";

export const leaderboardRouter = express.Router();

leaderboardRouter.get("/", async (req, res) => {
  const users = await User.find({ isBlocked: false })
    .sort({ xp: -1, updatedAt: -1 })
    .limit(100);

  return res.json({
    items: users.map((user) => ({
      ...normalizeUser(user),
      country: user.countries?.[user.countries.length - 1] || "Мир",
      city: user.cities?.[user.cities.length - 1] || "",
    })),
  });
});
