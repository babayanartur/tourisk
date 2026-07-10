import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { config } from "./config.js";
import { AdminUser } from "./models/AdminUser.js";
import { Achievement, AppConfig, Pawn, Place } from "./models/GameContent.js";

const achievements = [
  { id: "first_step", title: "Первый шаг", description: "Сделай первый check-in", icon: "🧭", conditionType: "cells", conditionValue: 1, rewardXp: 20 },
  { id: "explorer", title: "Исследователь", description: "Открой 5 территорий", icon: "🗺️", conditionType: "cells", conditionValue: 5, rewardXp: 50 },
  { id: "traveler", title: "Путешественник", description: "Открой первую страну", icon: "🌍", conditionType: "countries", conditionValue: 1, rewardXp: 70 },
  { id: "pathfinder", title: "Первопроходец", description: "Открой 50 территорий", icon: "🏆", conditionType: "cells", conditionValue: 50, rewardXp: 200 }
];

const pawns = [
  { id: "pawn_green", name: "Зелёная фигурка", imagePath: "", condition: "Доступна сразу", unlockType: "level", unlockValue: 1 },
  { id: "pawn_bronze", name: "Бронзовая фигурка", imagePath: "", condition: "Открой 10 территорий", unlockType: "cells", unlockValue: 10 },
  { id: "pawn_gold", name: "Золотая фигурка", imagePath: "", condition: "Достигни 5 уровня", unlockType: "level", unlockValue: 5 },
  { id: "pawn_crystal", name: "Кристальная фигурка", imagePath: "", condition: "Открой 3 страны", unlockType: "countries", unlockValue: 3 }
];

const places = [
  { id: "cascade", name: "Каскад", city: "Ереван", country: "Армения", latitude: 40.1919, longitude: 44.5152, rarity: "legendary", xp: 50 },
  { id: "republic", name: "Площадь Республики", city: "Ереван", country: "Армения", latitude: 40.1776, longitude: 44.5126, rarity: "legendary", xp: 50 },
  { id: "matenadaran", name: "Матенадаран", city: "Ереван", country: "Армения", latitude: 40.1912, longitude: 44.5213, rarity: "epic", xp: 40 },
  { id: "mother_armenia", name: "Мать Армения", city: "Ереван", country: "Армения", latitude: 40.2024, longitude: 44.5235, rarity: "legendary", xp: 60 },
  { id: "opera", name: "Оперный театр", city: "Ереван", country: "Армения", latitude: 40.1867, longitude: 44.5145, rarity: "rare", xp: 30 }
];

async function upsertMany(Model, list) {
  for (const item of list) await Model.findOneAndUpdate({ id: item.id }, item, { upsert: true, new: true });
}

async function seedAdmin() {
  const login = String(config.adminLogin || "admin").trim().toLowerCase();
  const passwordHash = await bcrypt.hash(String(config.adminPassword || "tourisk1111"), 10);
  await AdminUser.findOneAndUpdate(
    { login },
    { login, passwordHash, name: "Tourisk Owner", role: "owner", isActive: true },
    { upsert: true, new: true }
  );
}

async function main() {
  await mongoose.connect(config.mongoUri);
  await upsertMany(Achievement, achievements);
  await upsertMany(Pawn, pawns);
  await upsertMany(Place, places);
  await seedAdmin();
  await AppConfig.findOneAndUpdate(
    { key: "public" },
    {
      key: "public",
      value: {
        welcomeTitle: "Мир ждёт тебя.",
        revealRadiusMeters: 145,
        trailLifetimeSeconds: 28,
        testCode: "1111",
        appStage: "mvp-stage2"
      }
    },
    { upsert: true }
  );
  await mongoose.disconnect();
  console.log("Tourisk seed completed");
  console.log(`Admin: ${config.adminLogin} / ${config.adminPassword}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
