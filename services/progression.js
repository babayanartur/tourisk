export function getProgressMetric(stats = {}, type) {
  const valueByType = {
    cells: stats.territories,
    territories: stats.territories,
    cities: stats.cities,
    countries: stats.countries,
    xp: stats.xp,
    level: stats.level,
    distance: stats.distanceKm,
    distanceKm: stats.distanceKm,
    exploredKm2: stats.exploredKm2,
    legendaryPlaces: stats.legendaryPlaces,
    hiddenPlaces: stats.hiddenPlaces,
    yerevanPlaces: stats.yerevanPlaces,
    yerevanPercent: stats.yerevanPercent,
    stars: stats.stars,
    streakDays: stats.streakDays,
    achievements: stats.achievements,
  };

  return Number(valueByType[type] || 0);
}

export function isRequirementMet(item, stats = {}) {
  if (!item) return false;
  const type = item.conditionType || item.unlockType || "level";
  const target = Number(item.conditionValue || item.unlockValue || 1);
  return getProgressMetric(stats, type) >= target;
}

export function requirementProgress(item, stats = {}) {
  if (!item) return { current: 0, target: 1, percent: 0 };
  const type = item.conditionType || item.unlockType || "level";
  const target = Math.max(1, Number(item.conditionValue || item.unlockValue || 1));
  const current = getProgressMetric(stats, type);
  return {
    current,
    target,
    percent: Math.min(100, Math.round((current / target) * 100)),
  };
}
