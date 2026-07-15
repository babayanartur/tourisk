import mongoose from "mongoose";

const PROGRESS_TYPES = [
  "cells",
  "territories",
  "cities",
  "countries",
  "level",
  "xp",
  "distanceKm",
  "exploredKm2",
  "legendaryPlaces",
  "hiddenPlaces",
  "yerevanPlaces",
  "yerevanPercent",
  "stars",
  "streakDays",
  "achievements",
];

const RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "mythic", "shadow", "hidden"];

const AchievementSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    icon: { type: String, default: "🏅", trim: true },
    imagePath: { type: String, default: "", trim: true },
    conditionType: { type: String, enum: PROGRESS_TYPES, default: "cells" },
    conditionValue: { type: Number, default: 1, min: 0 },
    rewardXp: { type: Number, default: 0, min: 0 },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const PawnSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    imageUrl: { type: String, default: "", trim: true },
    imagePath: { type: String, default: "", trim: true },
    glowColor: { type: String, default: "", trim: true },
    mapScale: { type: Number, default: 1, min: 0.6, max: 1.8 },
    rarity: { type: String, enum: RARITIES, default: "common" },
    unlockType: { type: String, enum: PROGRESS_TYPES, default: "level" },
    unlockValue: { type: Number, default: 1, min: 0 },
    condition: { type: String, default: "Доступна сразу", trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const PlaceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    icon: { type: String, default: "✦", trim: true },
    city: { type: String, default: "", trim: true },
    country: { type: String, default: "", trim: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    rarity: { type: String, enum: RARITIES, default: "rare" },
    xp: { type: Number, default: 30, min: 0 },
    discoveryRadiusMeters: { type: Number, default: 220, min: 40, max: 1000 },
    imagePath: { type: String, default: "", trim: true },
    sortOrder: { type: Number, default: 0 },
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
