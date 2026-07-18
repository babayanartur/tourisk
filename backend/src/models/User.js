import mongoose from "mongoose";

const LocationPointSchema = new mongoose.Schema(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    cellId: { type: String, required: true },
    city: { type: String, default: "" },
    country: { type: String, default: "" },
    source: { type: String, default: "gps" },
    accuracy: { type: Number, default: null },
    speed: { type: Number, default: 0 },
    transportMode: { type: String, enum: ["stationary", "walking", "bicycle", "driving"], default: "stationary" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    nickname: { type: String, default: "Explorer", trim: true },
    provider: { type: String, enum: ["email", "apple", "google", "demo"], default: "email" },
    selectedPawn: { type: String, default: "pawn_green" },
    xp: { type: Number, default: 0 },
    coins: { type: Number, default: 0 },
    stars: { type: Number, default: 0 },
    distanceMeters: { type: Number, default: 0 },
    streakDays: { type: Number, default: 1 },
    lastActiveDate: { type: Date, default: null },
    transportMode: { type: String, enum: ["stationary", "walking", "bicycle", "driving"], default: "stationary" },
    lastExplorationRewardAt: { type: Date, default: null },
    lastExplorationRewardLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    openedPlaces: { type: [String], default: [] },
    level: { type: Number, default: 1 },
    visitedCells: { type: [String], default: [] },
    cities: { type: [String], default: [] },
    countries: { type: [String], default: [] },
    achievements: { type: [String], default: [] },
    lastLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      speed: { type: Number, default: 0 },
      transportMode: { type: String, enum: ["stationary", "walking", "bicycle", "driving"], default: "stationary" },
      updatedAt: { type: Date, default: null },
    },
    recentTrail: { type: [LocationPointSchema], default: [] },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

UserSchema.virtual("exploredKm2").get(function getExploredKm2() {
  return Number(((this.visitedCells?.length || 0) * 0.01).toFixed(2));
});

UserSchema.virtual("citiesCount").get(function getCitiesCount() {
  return this.cities?.length || 0;
});

UserSchema.virtual("countriesCount").get(function getCountriesCount() {
  return this.countries?.length || 0;
});

UserSchema.virtual("achievementsCount").get(function getAchievementsCount() {
  return this.achievements?.length || 0;
});

UserSchema.set("toJSON", { virtuals: true });
UserSchema.set("toObject", { virtuals: true });

export const User = mongoose.model("User", UserSchema);
