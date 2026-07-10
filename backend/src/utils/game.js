export function getCellId(latitude, longitude) {
  const cellSize = 0.00045;
  const latCell = Math.floor(Number(latitude) / cellSize);
  const lngCell = Math.floor(Number(longitude) / cellSize);
  return `world:${latCell}_${lngCell}`;
}

export function normalizeUser(user) {
  const raw = typeof user.toObject === "function" ? user.toObject({ virtuals: true }) : user;
  const visitedCount = raw.visitedCells?.length || 0;
  const xp = Number(raw.xp || 0);

  return {
    id: raw._id?.toString?.() || raw.id,
    email: raw.email,
    nickname: raw.nickname,
    provider: raw.provider,
    selectedPawn: raw.selectedPawn || "pawn_green",
    xp,
    coins: Number(raw.coins || 0),
    level: Math.floor(xp / 100) + 1,
    exploredKm2: Number((visitedCount * 0.01).toFixed(2)),
    territories: visitedCount,
    citiesCount: raw.cities?.length || 0,
    countriesCount: raw.countries?.length || 0,
    achievementsCount: raw.achievements?.length || 0,
    lastLocation: raw.lastLocation || null,
    isBlocked: Boolean(raw.isBlocked),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function applyProgress(user, payload, achievements = []) {
  const cellId = payload.cellId || getCellId(payload.latitude, payload.longitude);
  const isNewCell = !user.visitedCells.includes(cellId);

  if (isNewCell) {
    user.visitedCells.push(cellId);
    user.xp += 10;
    user.coins += 3;
  }

  if (payload.city && !user.cities.includes(payload.city)) {
    user.cities.push(payload.city);
    user.xp += 20;
    user.coins += 10;
  }

  if (payload.country && !user.countries.includes(payload.country)) {
    user.countries.push(payload.country);
    user.xp += 30;
  }

  user.level = Math.floor(user.xp / 100) + 1;
  user.lastLocation = {
    latitude: Number(payload.latitude),
    longitude: Number(payload.longitude),
    updatedAt: new Date(),
  };

  user.recentTrail.push({
    latitude: Number(payload.latitude),
    longitude: Number(payload.longitude),
    cellId,
    city: payload.city || "",
    country: payload.country || "",
    source: payload.source || "gps",
    createdAt: new Date(),
  });

  user.recentTrail = user.recentTrail.slice(-100);

  const unlocked = [];

  achievements.forEach((achievement) => {
    if (!achievement.isActive || user.achievements.includes(achievement.id)) return;

    let done = false;
    if (achievement.conditionType === "cells") done = user.visitedCells.length >= achievement.conditionValue;
    if (achievement.conditionType === "cities") done = user.cities.length >= achievement.conditionValue;
    if (achievement.conditionType === "countries") done = user.countries.length >= achievement.conditionValue;
    if (achievement.conditionType === "level") done = user.level >= achievement.conditionValue;
    if (achievement.conditionType === "xp") done = user.xp >= achievement.conditionValue;

    if (done) {
      user.achievements.push(achievement.id);
      user.xp += Number(achievement.rewardXp || 0);
      unlocked.push(achievement);
    }
  });

  user.level = Math.floor(user.xp / 100) + 1;
  return { isNewCell, cellId, unlocked };
}
