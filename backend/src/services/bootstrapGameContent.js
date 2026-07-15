import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "../config.js";
import { DEFAULT_ACHIEVEMENTS, DEFAULT_PAWNS, DEFAULT_PLACES, DEFAULT_PUBLIC_CONFIG } from "../content/defaultGameContent.js";
import { AdminUser } from "../models/AdminUser.js";
import { Achievement, AppConfig, Pawn, Place } from "../models/GameContent.js";
import { User } from "../models/User.js";
import { uploadsRoot } from "../utils/publicAsset.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedPawnDir = path.join(__dirname, "..", "..", "seed-assets", "pawns");
const seedPlaceDir = path.join(__dirname, "..", "..", "seed-assets", "places");

function ensureDefaultPawnFiles() {
  fs.mkdirSync(path.join(uploadsRoot, "pawns"), { recursive: true });
  for (const pawn of DEFAULT_PAWNS) {
    const filename = path.basename(pawn.imagePath || "");
    if (!filename) continue;
    const source = path.join(seedPawnDir, filename);
    const destination = path.join(uploadsRoot, "pawns", filename);
    if (fs.existsSync(source) && !fs.existsSync(destination)) fs.copyFileSync(source, destination);
  }
}


function ensureDefaultPlaceFiles() {
  fs.mkdirSync(path.join(uploadsRoot, "places"), { recursive: true });
  for (const place of DEFAULT_PLACES) {
    const filename = path.basename(place.imagePath || "");
    if (!filename) continue;
    const source = path.join(seedPlaceDir, filename);
    const destination = path.join(uploadsRoot, "places", filename);
    if (fs.existsSync(source) && !fs.existsSync(destination)) fs.copyFileSync(source, destination);
  }
}

const LEGACY_PAWN_PATHS = new Map(DEFAULT_PAWNS.map((pawn) => [
  pawn.id,
  String(pawn.imagePath || "").replace("_v13.png", ".png"),
]));

async function upsertDefaults(Model, items) {
  for (const item of items) {
    const existing = await Model.findOne({ id: item.id });
    if (!existing) {
      await Model.create(item);
      continue;
    }

    const patch = {};
    const legacyPawnPath = LEGACY_PAWN_PATHS.get(item.id);
    const shouldMigrateDefaultPawn = Model === Pawn
      && item.imagePath
      && legacyPawnPath
      && (!existing.imagePath || existing.imagePath === legacyPawnPath);
    if ((!existing.imagePath && item.imagePath) || shouldMigrateDefaultPawn) patch.imagePath = item.imagePath;
    if (existing.sortOrder === undefined || existing.sortOrder === null) patch.sortOrder = item.sortOrder || 0;

    if (Model === Place) {
      const canonicalFields = [
        "name", "description", "icon", "city", "country", "latitude", "longitude",
        "rarity", "xp", "discoveryRadiusMeters", "imagePath", "sortOrder", "isActive",
      ];
      for (const field of canonicalFields) {
        if (item[field] !== undefined && JSON.stringify(existing[field]) !== JSON.stringify(item[field])) {
          patch[field] = item[field];
        }
      }
    }

    if (Object.keys(patch).length) await Model.updateOne({ _id: existing._id }, { $set: patch });
  }
}

const CONTENT_SEED_VERSION = 3;

const LEGACY_PLACE_ID_MAP = {
  republic: "republic_square",
  opera: "opera_theatre",
  mother: "mother_armenia",
  hidden_blue_mosque: "blue_mosque",
};

const LEGACY_PLACES_TO_DISABLE = [
  ...Object.keys(LEGACY_PLACE_ID_MAP),
  "hidden_cond",
  "hidden_nork",
  "hidden_hrazdan",
  "hidden_garden",
];

async function ensureDefaultContent({ forceContent = false } = {}) {
  const marker = await AppConfig.findOne({ key: "system:content-seed" }).lean();
  const currentVersion = Number(marker?.value?.version || 0);
  if (!forceContent && currentVersion >= CONTENT_SEED_VERSION) return;

  await upsertDefaults(Achievement, DEFAULT_ACHIEVEMENTS);
  await upsertDefaults(Pawn, DEFAULT_PAWNS);
  await upsertDefaults(Place, DEFAULT_PLACES);
  await Place.updateMany({ id: { $in: LEGACY_PLACES_TO_DISABLE } }, { $set: { isActive: false } });

  for (const [legacyId, canonicalId] of Object.entries(LEGACY_PLACE_ID_MAP)) {
    await User.updateMany({ openedPlaces: legacyId }, { $addToSet: { openedPlaces: canonicalId } });
    await User.updateMany({ openedPlaces: legacyId }, { $pull: { openedPlaces: legacyId } });
  }

  await AppConfig.findOneAndUpdate(
    { key: "system:content-seed" },
    { $set: { value: { version: CONTENT_SEED_VERSION, seededAt: new Date().toISOString() } } },
    { upsert: true, new: true }
  );
}

async function ensureAdmin({ forceAdminPassword = false } = {}) {
  const login = String(config.adminLogin || "admin").trim().toLowerCase();
  const existing = await AdminUser.findOne({ login });
  if (existing && !forceAdminPassword) return existing;

  const passwordHash = await bcrypt.hash(String(config.adminPassword || "tourisk1111"), 10);
  const update = forceAdminPassword
    ? {
        $set: { passwordHash, isActive: true },
        $setOnInsert: { login, name: "Tourisk Owner", role: "owner" },
      }
    : {
        $set: { isActive: true },
        $setOnInsert: { login, passwordHash, name: "Tourisk Owner", role: "owner" },
      };

  return AdminUser.findOneAndUpdate(
    { login },
    update,
    { upsert: true, new: true }
  );
}

async function ensurePublicConfig() {
  const existing = await AppConfig.findOne({ key: "public" }).lean();
  const value = { ...DEFAULT_PUBLIC_CONFIG, ...(existing?.value || {}) };
  return AppConfig.findOneAndUpdate(
    { key: "public" },
    { $set: { value } },
    { upsert: true, new: true }
  );
}

export async function bootstrapGameContent(options = {}) {
  ensureDefaultPawnFiles();
  ensureDefaultPlaceFiles();
  await ensureDefaultContent(options);
  await ensureAdmin(options);
  await ensurePublicConfig();

  const [achievements, pawns, places] = await Promise.all([
    Achievement.countDocuments(),
    Pawn.countDocuments(),
    Place.countDocuments(),
  ]);

  return { achievements, pawns, places };
}
