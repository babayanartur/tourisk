import mongoose from "mongoose";

const AchievementSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    icon: { type: String, default: "🏅" },
    imagePath: { type: String, default: "" },
    conditionType: { type: String, enum: ["cells", "cities", "countries", "level", "xp"], default: "cells" },
    conditionValue: { type: Number, default: 1 },
    rewardXp: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const PawnSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: "" },
    imagePath: { type: String, default: "" },
    unlockType: { type: String, enum: ["level", "cells", "cities", "countries", "xp"], default: "level" },
    unlockValue: { type: Number, default: 1 },
    condition: { type: String, default: "Доступна сразу" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const PlaceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    city: { type: String, default: "" },
    country: { type: String, default: "" },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    rarity: { type: String, enum: ["common", "rare", "epic", "legendary"], default: "rare" },
    xp: { type: Number, default: 30 },
    imagePath: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const AppConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const Achievement = mongoose.model("Achievement", AchievementSchema);
export const Pawn = mongoose.model("Pawn", PawnSchema);
export const Place = mongoose.model("Place", PlaceSchema);
export const AppConfig = mongoose.model("AppConfig", AppConfigSchema);
