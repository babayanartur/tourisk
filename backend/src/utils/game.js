const FIRST_LEVEL_REQUIREMENTS = [100, 180, 300, 450, 650];
const CAR_SPEED_MPS = 7.5;
const BICYCLE_SPEED_MPS = 2.8;
const MAX_EXPLORATION_ACCURACY = 80;
const REWARD_COOLDOWN_MS = 45_000;
const REWARD_DISTANCE_METERS = 35;

export function getLevelRequirement(level) {
  const safeLevel = Math.max(1, Math.floor(Number(level || 1)));
  if (safeLevel <= FIRST_LEVEL_REQUIREMENTS.length) return FIRST_LEVEL_REQUIREMENTS[safeLevel - 1];
  const step = safeLevel - FIRST_LEVEL_REQUIREMENTS.length;
  return Math.ceil((650 + 150 * step + 25 * step * step) / 25) * 25;
}

export function getLevelStartXp(level) {
  const safeLevel = Math.max(1, Math.floor(Number(level || 1)));
  let total = 0;
  for (let current = 1; current < safeLevel; current += 1) total += getLevelRequirement(current);
  return total;
}

export function getLevelFromXp(xp) {
  const safeXp = Math.max(0, Number(xp || 0));
  let level = 1;
  let threshold = getLevelRequirement(level);
  while (safeXp >= threshold && level < 500) {
    level += 1;
    threshold += getLevelRequirement(level);
  }
  return level;
}

export function getCellId(latitude, longitude) {
  const cellSize = 0.00045;
  const latCell = Math.floor(Number(latitude) / cellSize);
  const lngCell = Math.floor(Number(longitude) / cellSize);
  return `world:${latCell}_${lngCell}`;
}

export function distanceMeters(a, b) {
  if (!a || !b) return 0;
  const lat1 = Number(a.latitude);
  const lon1 = Number(a.longitude);
  const lat2 = Number(b.latitude);
  const lon2 = Number(b.longitude);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return 0;
  const latitude = (lat1 + lat2) / 2;
  const dy = (lat2 - lat1) * 111320;
  const dx = (lon2 - lon1) * 111320 * Math.cos((latitude * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

function dateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function daysBetween(a, b) {
  const start = new Date(a);
  const end = new Date(b);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

export function updateActivityStreak(user, now = new Date()) {
  if (!user.lastActiveDate) {
    user.streakDays = Math.max(1, Number(user.streakDays || 1));
    user.lastActiveDate = now;
    return;
  }
  if (dateKey(user.lastActiveDate) === dateKey(now)) return;
  const delta = daysBetween(user.lastActiveDate, now);
  user.streakDays = delta === 1 ? Number(user.streakDays || 1) + 1 : 1;
  user.lastActiveDate = now;
}

export function getProgressValue(user, type, context = {}) {
  const visitedCells = user.visitedCells?.length || 0;
  const openedPlaces = new Set(user.openedPlaces || []);
  const placesById = context.placesById || new Map();
  const openedDocs = Array.from(openedPlaces).map((id) => placesById.get(id)).filter(Boolean);
  const yerevanOpened = openedDocs.filter((place) => String(place.city || "").toLowerCase().includes("ереван")).length;
  const yerevanTotal = Math.max(1, Number(context.yerevanTotal || 0));

  const metrics = {
    cells: visitedCells,
    territories: visitedCells,
    cities: user.cities?.length || 0,
    countries: user.countries?.length || 0,
    level: getLevelFromXp(user.xp),
    xp: Number(user.xp || 0),
    distanceKm: Number(user.distanceMeters || 0) / 1000,
    exploredKm2: visitedCells * 0.01,
    legendaryPlaces: openedDocs.filter((place) => place.rarity === "legendary").length,
    hiddenPlaces: openedDocs.filter((place) => place.rarity === "hidden").length,
    yerevanPlaces: yerevanOpened,
    yerevanPercent: (yerevanOpened / yerevanTotal) * 100,
    stars: Number(user.stars || 0),
    streakDays: Number(user.streakDays || 1),
    achievements: user.achievements?.length || 0,
  };
  return Number(metrics[type] || 0);
}

export function unlockAchievements(user, achievements = [], context = {}) {
  user.achievements = Array.isArray(user.achievements) ? user.achievements : [];
  const unlocked = [];
  let changed = true;
  let passes = 0;

  while (changed && passes < achievements.length + 2) {
    changed = false;
    passes += 1;
    for (const achievement of achievements) {
      if (achievement.isActive === false || user.achievements.includes(achievement.id)) continue;
      const current = getProgressValue(user, achievement.conditionType, context);
      if (current < Number(achievement.conditionValue || 0)) continue;
      user.achievements.push(achievement.id);
      user.xp += Number(achievement.rewardXp || 0);
      user.stars += Math.max(1, Math.round(Number(achievement.rewardXp || 0) / 20));
      unlocked.push(achievement);
      changed = true;
    }
  }

  user.level = getLevelFromXp(user.xp);
  return unlocked;
}

export function normalizeUser(user, options = {}) {
  const raw = typeof user.toObject === "function" ? user.toObject({ virtuals: true }) : user;
  const visitedCount = raw.visitedCells?.length || 0;
  const xp = Number(raw.xp || 0);

  const normalized = {
    id: raw._id?.toString?.() || raw.id,
    email: raw.email,
    nickname: raw.nickname,
    provider: raw.provider,
    selectedPawn: raw.selectedPawn || "pawn_green",
    xp,
    coins: Number(raw.coins || 0),
    stars: Number(raw.stars || 0),
    level: getLevelFromXp(xp),
    exploredKm2: Number((visitedCount * 0.01).toFixed(2)),
    territories: visitedCount,
    citiesCount: raw.cities?.length || 0,
    countriesCount: raw.countries?.length || 0,
    achievementsCount: raw.achievements?.length || 0,
    achievements: raw.achievements || [],
    openedPlaces: raw.openedPlaces || [],
    distanceKm: Number((Number(raw.distanceMeters || 0) / 1000).toFixed(2)),
    stepsCount: Math.max(0, Math.round(Number(raw.distanceMeters || 0) / 0.75)),
    streakDays: Number(raw.streakDays || 1),
    lastActiveDate: raw.lastActiveDate || null,
    lastLocation: raw.lastLocation || null,
    transportMode: raw.transportMode || raw.lastLocation?.transportMode || "stationary",
    isBlocked: Boolean(raw.isBlocked),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };

  if (options.includePrivate) {
    normalized.visitedCells = raw.visitedCells || [];
    normalized.cities = raw.cities || [];
    normalized.countries = raw.countries || [];
  }

  return normalized;
}

function classifyTransport(payload, previousLocation, currentLocation, distanceDelta) {
  const timestamp = new Date();
  const previousTimestamp = previousLocation?.updatedAt ? new Date(previousLocation.updatedAt) : null;
  const elapsedSeconds = previousTimestamp && !Number.isNaN(previousTimestamp.getTime())
    ? Math.max(1, (timestamp.getTime() - previousTimestamp.getTime()) / 1000)
    : 0;
  const inferredSpeed = elapsedSeconds > 0 ? distanceDelta / elapsedSeconds : 0;
  const reportedSpeed = Number(payload.speedMps);
  const speed = Number.isFinite(reportedSpeed) && reportedSpeed >= 0 ? reportedSpeed : inferredSpeed;
  const requested = String(payload.transportMode || "").toLowerCase();

  if (requested === "driving" || speed >= CAR_SPEED_MPS) return { mode: "driving", speed, inferredSpeed, timestamp };
  if (requested === "bicycle" || speed >= BICYCLE_SPEED_MPS) return { mode: "bicycle", speed, inferredSpeed, timestamp };
  if (requested === "walking" || speed >= 0.55) return { mode: "walking", speed, inferredSpeed, timestamp };
  return { mode: "stationary", speed, inferredSpeed, timestamp };
}

export function applyProgress(user, payload, achievements = [], context = {}) {
  user.xp = Number(user.xp || 0);
  user.coins = Number(user.coins || 0);
  user.stars = Number(user.stars || 0);
  user.distanceMeters = Number(user.distanceMeters || 0);
  user.streakDays = Math.max(1, Number(user.streakDays || 1));
  user.visitedCells = Array.isArray(user.visitedCells) ? user.visitedCells : [];
  user.cities = Array.isArray(user.cities) ? user.cities : [];
  user.countries = Array.isArray(user.countries) ? user.countries : [];
  user.recentTrail = Array.isArray(user.recentTrail) ? user.recentTrail : [];

  const xpBefore = Number(user.xp || 0);
  const cellId = payload.cellId || getCellId(payload.latitude, payload.longitude);
  const requestedCellIds = Array.isArray(payload.cellIds) && payload.cellIds.length ? payload.cellIds : [cellId];
  const normalizedCellIds = Array.from(new Set(
    requestedCellIds.map((value) => String(value || "").trim()).filter(Boolean)
  )).slice(0, 64);

  const previousLocation = user.lastLocation?.latitude != null && user.lastLocation?.longitude != null
    ? {
        latitude: user.lastLocation.latitude,
        longitude: user.lastLocation.longitude,
        updatedAt: user.lastLocation.updatedAt,
      }
    : null;
  const currentLocation = { latitude: Number(payload.latitude), longitude: Number(payload.longitude) };
  const distanceDelta = distanceMeters(previousLocation, currentLocation);
  const movement = classifyTransport(payload, previousLocation, currentLocation, distanceDelta);
  const accuracy = Number(payload.accuracy || 0);
  const badAccuracy = Number.isFinite(accuracy) && accuracy > MAX_EXPLORATION_ACCURACY;
  const impossibleJump = movement.inferredSpeed > 50 || distanceDelta > 1500;
  const explorationBlocked = movement.mode === "driving" || badAccuracy || impossibleJump;

  const newCellIds = explorationBlocked
    ? []
    : normalizedCellIds.filter((value) => !user.visitedCells.includes(value));
  const isNewCell = newCellIds.length > 0;
  if (isNewCell) user.visitedCells.push(...newCellIds);

  if (!explorationBlocked && distanceDelta >= 2 && distanceDelta <= 160 && movement.inferredSpeed < CAR_SPEED_MPS) {
    user.distanceMeters += distanceDelta;
  }

  let explorationReward = 0;
  if (isNewCell) {
    const lastRewardAt = user.lastExplorationRewardAt ? new Date(user.lastExplorationRewardAt) : null;
    const elapsedReward = lastRewardAt && !Number.isNaN(lastRewardAt.getTime())
      ? movement.timestamp.getTime() - lastRewardAt.getTime()
      : Infinity;
    const rewardDistance = user.lastExplorationRewardLocation?.latitude != null
      ? distanceMeters(user.lastExplorationRewardLocation, currentLocation)
      : Infinity;

    if (elapsedReward >= REWARD_COOLDOWN_MS && rewardDistance >= REWARD_DISTANCE_METERS) {
      explorationReward = movement.mode === "bicycle" ? 4 : 8;
      user.xp += explorationReward;
      user.coins += movement.mode === "bicycle" ? 1 : 2;
      user.stars += movement.mode === "bicycle" ? 1 : 2;
      user.lastExplorationRewardAt = movement.timestamp;
      user.lastExplorationRewardLocation = currentLocation;
    }
  }

  if (!explorationBlocked && payload.city && !user.cities.includes(payload.city)) {
    user.cities.push(payload.city);
    user.xp += 20;
    user.coins += 10;
    user.stars += 10;
  }

  if (!explorationBlocked && payload.country && !user.countries.includes(payload.country)) {
    user.countries.push(payload.country);
    user.xp += 30;
    user.stars += 15;
  }

  updateActivityStreak(user, movement.timestamp);
  user.transportMode = movement.mode;
  user.lastLocation = {
    ...currentLocation,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    speed: movement.speed,
    transportMode: movement.mode,
    updatedAt: movement.timestamp,
  };

  user.recentTrail.push({
    ...currentLocation,
    cellId,
    city: payload.city || "",
    country: payload.country || "",
    source: payload.source || "gps",
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    speed: movement.speed,
    transportMode: movement.mode,
    createdAt: movement.timestamp,
  });
  user.recentTrail = user.recentTrail.slice(-100);

  const unlocked = explorationBlocked ? [] : unlockAchievements(user, achievements, context);
  user.level = getLevelFromXp(user.xp);
  const xpDelta = Math.max(0, Number(user.xp || 0) - xpBefore);

  return {
    isNewCell,
    cellId,
    cellIds: normalizedCellIds,
    newCellIds,
    distanceDelta: explorationBlocked ? 0 : distanceDelta,
    explorationReward,
    explorationBlocked,
    transportMode: movement.mode,
    speedMps: movement.speed,
    accuracy,
    xpDelta,
    unlocked,
  };
}
