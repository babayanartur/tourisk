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
    level: Number(user.level || Math.floor(Number(user.xp || 0) / 100) + 1),
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
  const unlocked = [];
  let changed = true;
  let passes = 0;

  while (changed && passes < achievements.length + 2) {
    changed = false;
    passes += 1;
    for (const achievement of achievements) {
      if (!achievement.isActive || user.achievements.includes(achievement.id)) continue;
      const current = getProgressValue(user, achievement.conditionType, context);
      if (current < Number(achievement.conditionValue || 0)) continue;
      user.achievements.push(achievement.id);
      user.xp += Number(achievement.rewardXp || 0);
      user.stars += Math.max(1, Math.round(Number(achievement.rewardXp || 0) / 20));
      unlocked.push(achievement);
      changed = true;
    }
  }

  user.level = Math.floor(Number(user.xp || 0) / 100) + 1;
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
    level: Math.floor(xp / 100) + 1,
    exploredKm2: Number((visitedCount * 0.01).toFixed(2)),
    territories: visitedCount,
    citiesCount: raw.cities?.length || 0,
    countriesCount: raw.countries?.length || 0,
    achievementsCount: raw.achievements?.length || 0,
    achievements: raw.achievements || [],
    openedPlaces: raw.openedPlaces || [],
    distanceKm: Number((Number(raw.distanceMeters || 0) / 1000).toFixed(2)),
    streakDays: Number(raw.streakDays || 1),
    lastActiveDate: raw.lastActiveDate || null,
    lastLocation: raw.lastLocation || null,
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

export function applyProgress(user, payload, achievements = [], context = {}) {
  const cellId = payload.cellId || getCellId(payload.latitude, payload.longitude);
  const requestedCellIds = Array.isArray(payload.cellIds) && payload.cellIds.length ? payload.cellIds : [cellId];
  const normalizedCellIds = Array.from(new Set(requestedCellIds.map((value) => String(value || "").trim()).filter(Boolean))).slice(0, 64);
  const newCellIds = normalizedCellIds.filter((value) => !user.visitedCells.includes(value));
  const isNewCell = newCellIds.length > 0;

  const previousLocation = user.lastLocation?.latitude != null && user.lastLocation?.longitude != null
    ? { latitude: user.lastLocation.latitude, longitude: user.lastLocation.longitude }
    : null;
  const currentLocation = { latitude: Number(payload.latitude), longitude: Number(payload.longitude) };
  const distanceDelta = distanceMeters(previousLocation, currentLocation);
  if (distanceDelta >= 2 && distanceDelta <= 500) user.distanceMeters += distanceDelta;

  if (isNewCell) {
    user.visitedCells.push(...newCellIds);
    user.xp += 10;
    user.coins += 3;
    user.stars += 5;
  }

  if (payload.city && !user.cities.includes(payload.city)) {
    user.cities.push(payload.city);
    user.xp += 20;
    user.coins += 10;
    user.stars += 10;
  }

  if (payload.country && !user.countries.includes(payload.country)) {
    user.countries.push(payload.country);
    user.xp += 30;
    user.stars += 15;
  }

  updateActivityStreak(user);
  user.level = Math.floor(user.xp / 100) + 1;
  user.lastLocation = { ...currentLocation, updatedAt: new Date() };

  user.recentTrail.push({
    ...currentLocation,
    cellId,
    city: payload.city || "",
    country: payload.country || "",
    source: payload.source || "gps",
    createdAt: new Date(),
  });
  user.recentTrail = user.recentTrail.slice(-100);

  const unlocked = unlockAchievements(user, achievements, context);
  return { isNewCell, cellId, cellIds: normalizedCellIds, newCellIds, distanceDelta, unlocked };
}
