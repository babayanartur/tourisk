import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "./storageKeys";

let queue = Promise.resolve();

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function emptyJourney(dateKey) {
  return {
    dateKey,
    distanceMeters: 0,
    placeIds: [],
    newTerritories: 0,
    explorationSeconds: 0,
    lastActivityAt: null,
    updatedAt: Date.now(),
  };
}

function safeParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function readAll() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.dailyJourneys);
  return safeParse(raw, {});
}

async function mutateToday(mutator, now = new Date()) {
  const dateKey = localDateKey(now);
  queue = queue.then(async () => {
    const all = await readAll();
    const current = { ...emptyJourney(dateKey), ...(all[dateKey] || {}) };
    const next = mutator(current) || current;
    next.dateKey = dateKey;
    next.updatedAt = now.getTime();

    const trimmedEntries = Object.entries({ ...all, [dateKey]: next })
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 35);
    await AsyncStorage.setItem(STORAGE_KEYS.dailyJourneys, JSON.stringify(Object.fromEntries(trimmedEntries)));
    return next;
  });
  return queue;
}

export function recordJourneyActivity({ distanceMeters = 0, newTerritories = 0, placeId = "", now = new Date() } = {}) {
  return mutateToday((journey) => {
    const timestamp = now.getTime();
    const previousActivity = Number(journey.lastActivityAt || 0);
    const gapSeconds = previousActivity ? Math.max(0, Math.round((timestamp - previousActivity) / 1000)) : 0;
    const activeDelta = gapSeconds > 0 && gapSeconds <= 90 ? Math.min(gapSeconds, 30) : 0;
    const placeIds = new Set(Array.isArray(journey.placeIds) ? journey.placeIds : []);
    if (placeId) placeIds.add(placeId);

    return {
      ...journey,
      distanceMeters: Number(journey.distanceMeters || 0) + Math.max(0, Number(distanceMeters || 0)),
      newTerritories: Number(journey.newTerritories || 0) + Math.max(0, Number(newTerritories || 0)),
      explorationSeconds: Number(journey.explorationSeconds || 0) + activeDelta,
      placeIds: Array.from(placeIds),
      lastActivityAt: timestamp,
    };
  }, now);
}

export async function getDailyJourney(date = new Date()) {
  await queue;
  const dateKey = localDateKey(date);
  const all = await readAll();
  return { ...emptyJourney(dateKey), ...(all[dateKey] || {}) };
}

export async function getEveningJourney({ now = new Date(), eveningHour = 18, force = false } = {}) {
  const dateKey = localDateKey(now);
  if (!force && now.getHours() < Number(eveningHour || 18)) return null;
  const lastShown = await AsyncStorage.getItem(STORAGE_KEYS.dailyJourneyLastShown);
  if (!force && lastShown === dateKey) return null;
  return getDailyJourney(now);
}

export async function markEveningJourneyShown(date = new Date()) {
  await AsyncStorage.setItem(STORAGE_KEYS.dailyJourneyLastShown, localDateKey(date));
}

export function formatJourneyDuration(totalSeconds = 0) {
  const seconds = Math.max(0, Math.round(Number(totalSeconds || 0)));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours && minutes) return `${hours} ч ${minutes} мин`;
  if (hours) return `${hours} ч`;
  if (minutes) return `${minutes} мин`;
  return "меньше минуты";
}

export function formatJourneyDistance(distanceMeters = 0) {
  const meters = Math.max(0, Number(distanceMeters || 0));
  if (meters < 1000) return `${Math.round(meters)} м`;
  return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} км`;
}
