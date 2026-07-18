import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Location from "expo-location";
import Constants from "expo-constants";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import LegendaryDiscoveryCard from "../components/LegendaryDiscoveryCard";
import ExplorerHUD from "../components/ExplorerHUD";
import FogOverlay from "../components/FogOverlay";
import MapFogClouds from "../components/MapFogClouds";
import LivingWorld from "../components/LivingWorld";
import StaticPawn from "../components/StaticPawn";
import {
  DEFAULT_PAWNS,
  getGameContent,
  refreshGameContent,
  saveLocationProgress,
  savePlaceDiscovery,
} from "../services/gameService";
import { getStoredUser, saveUser } from "../services/authService";
import { canonicalLegendaryPlaceId } from "../data/legendaryPlaces";
import { recordJourneyActivity } from "../services/dailyJourney";
import { getPlayerStats } from "../services/playerStats";
import { STORAGE_KEYS } from "../services/storageKeys";
import {
  getLocalPawnFallback,
  getPawnSource,
  getSelectedPawn,
  preloadPawnImages,
} from "../services/assetResolver";
import { DiscoveryEngine } from "../src/maps/services/DiscoveryEngine";
import { FogEngine } from "../src/maps/services/FogEngine";
import { GridEngine } from "../src/maps/services/GridEngine";
import { LevelEngine } from "../src/maps/services/LevelEngine";
import { TouriskMapStyle } from "../src/maps/styles/TouriskMapStyle";

const loadingBg = require("../assets/backgrounds/home-world-feedback.jpg");
const BACKGROUND_LOCATION_TASK = "TOURISK_BACKGROUND_LOCATION";
const IS_EXPO_GO = Constants.executionEnvironment === "storeClient" || Constants.appOwnership === "expo";
const MAX_EXPLORATION_ACCURACY = 80;
const CAR_SPEED_MPS = 7.5;
const BICYCLE_SPEED_MPS = 2.8;
const REWARD_COOLDOWN_MS = 45_000;
const REWARD_DISTANCE_METERS = 35;

const YEREVAN_COORDS = { latitude: 40.1811, longitude: 44.5136 };
const DEFAULT_REGION = {
  ...YEREVAN_COORDS,
  latitudeDelta: 0.032,
  longitudeDelta: 0.032,
};

function safeJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function movementMode(coords, previous) {
  let speed = Number(coords?.speed);
  if (!Number.isFinite(speed) || speed < 0) {
    if (previous?.timestamp && Number(coords?.timestamp) > previous.timestamp) {
      const distance = DiscoveryEngine.distanceMeters(
        previous.latitude,
        previous.longitude,
        Number(coords.latitude),
        Number(coords.longitude)
      );
      speed = distance / Math.max(1, (Number(coords.timestamp) - previous.timestamp) / 1000);
    } else {
      speed = 0;
    }
  }

  if (speed >= CAR_SPEED_MPS) return { mode: "driving", speed };
  if (speed >= BICYCLE_SPEED_MPS) return { mode: "bicycle", speed };
  if (speed >= 0.55) return { mode: "walking", speed };
  return { mode: "stationary", speed };
}

if (!IS_EXPO_GO && !TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    const location = data.locations[data.locations.length - 1];
    const point = location?.coords;
    if (!point) return;

    const timestamp = Number(location.timestamp || Date.now());
    const previousRaw = await AsyncStorage.getItem(STORAGE_KEYS.lastKnownLocation).catch(() => null);
    const previous = safeJson(previousRaw, null);
    const movement = movementMode({ ...point, timestamp }, previous);
    const current = {
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
      accuracy: Number(point.accuracy || 0),
      speed: movement.speed,
      transportMode: movement.mode,
      timestamp,
    };

    await AsyncStorage.multiSet([
      [STORAGE_KEYS.lastKnownLocation, JSON.stringify(current)],
      [STORAGE_KEYS.transportMode, movement.mode],
    ]).catch(() => {});

    if (movement.mode === "driving" || Number(point.accuracy || 0) > MAX_EXPLORATION_ACCURACY) return;

    const contentRaw = await AsyncStorage.getItem(STORAGE_KEYS.gameContent).catch(() => null);
    const cachedContent = safeJson(contentRaw, {});
    const backgroundRevealRadius = Math.max(55, Number(cachedContent?.appConfig?.revealRadiusMeters || 105));
    const revealed = GridEngine.getCellIdsInRadius(point.latitude, point.longitude, backgroundRevealRadius)
      .map((cellId) => GridEngine.getDistrictCellKey("world", cellId));
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.visitedCells);
    const cells = safeJson(saved, []);
    const merged = Array.from(new Set([...cells, ...revealed]));
    if (merged.length !== cells.length) {
      await AsyncStorage.setItem(STORAGE_KEYS.visitedCells, JSON.stringify(merged));
      await saveLocationProgress({
        latitude: current.latitude,
        longitude: current.longitude,
        cellId: GridEngine.getDistrictCellKey("world", GridEngine.getCellId(current.latitude, current.longitude)),
        cellIds: revealed,
        source: "background_gps",
        speedMps: current.speed,
        accuracy: current.accuracy,
        transportMode: movement.mode,
        timestamp,
      }).catch(() => null);
    }
  });
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const placesRef = useRef([]);
  const openedPlacesRef = useRef([]);
  const lastPositionRef = useRef(null);
  const lastGeocodeRef = useRef({ latitude: null, longitude: null, timestamp: 0 });
  const discoveryLockRef = useRef(false);
  const lastProgressSyncRef = useRef(0);
  const appConfigRef = useRef({ revealRadiusMeters: 105 });
  const mountedRef = useRef(true);
  const xpAnim = useRef(new Animated.Value(0)).current;
  const pawnPulse = useRef(new Animated.Value(0)).current;
  const locatePulse = useRef(new Animated.Value(0)).current;
  const positionQueueRef = useRef(Promise.resolve());

  const [location, setLocation] = useState(null);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [visitedCells, setVisitedCells] = useState([]);
  const [liveTrail, setLiveTrail] = useState([]);
  const [stats, setStats] = useState({ xp: 0, territories: 0, level: 1, selectedPawn: "pawn_green" });
  const [showXp, setShowXp] = useState(false);
  const [xpReward, setXpReward] = useState(0);
  const [discoveredPlace, setDiscoveredPlace] = useState(null);
  const [openedPlaces, setOpenedPlaces] = useState([]);
  const [places, setPlaces] = useState([]);
  const [pawns, setPawns] = useState(DEFAULT_PAWNS);
  const [appConfig, setAppConfig] = useState({ revealRadiusMeters: 105 });
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [currentZone, setCurrentZone] = useState("Ереван, Армения");
  const [transportMode, setTransportMode] = useState("stationary");

  useEffect(() => {
    mountedRef.current = true;
    let locationSubscription;

    const start = async () => {
      const cachedLocation = await loadLocalState();
      const foreground = await Location.requestForegroundPermissionsAsync();
      if (foreground.status !== "granted") {
        setPermissionDenied(true);
        return;
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
          timeInterval: 1800,
          mayShowUserSettingsDialog: true,
        },
        (position) => enqueuePosition(
          normalizeDeviceCoordinates({ ...position.coords, timestamp: position.timestamp || Date.now() }),
          { centerMap: false }
        )
      );

      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 5 * 60 * 1000,
        requiredAccuracy: 1000,
      }).catch(() => null);
      const immediate = lastKnown?.coords
        ? normalizeDeviceCoordinates({ ...lastKnown.coords, timestamp: lastKnown.timestamp || Date.now() })
        : cachedLocation;
      if (immediate) await enqueuePosition(immediate, { centerMap: true, allowStale: true });

      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
        .then((current) => enqueuePosition(
          normalizeDeviceCoordinates({ ...current.coords, timestamp: current.timestamp || Date.now() }),
          { centerMap: !immediate }
        ))
        .catch((error) => {
          if (!immediate && mountedRef.current) setLocationError(error?.message || "Не удалось определить геолокацию");
        });

      if (!IS_EXPO_GO) {
        Location.requestBackgroundPermissionsAsync()
          .then((background) => {
            if (background.status === "granted") return startBackgroundTracking();
            return null;
          })
          .catch(() => {});
      }

      refreshGameContent()
        .then((content) => {
          if (!mountedRef.current) return;
          const nextPlaces = content.places || [];
          const nextPawns = content.pawns?.length ? content.pawns : DEFAULT_PAWNS;
          placesRef.current = nextPlaces;
          setPlaces(nextPlaces);
          setPawns(nextPawns);
          const nextConfig = content.appConfig || { revealRadiusMeters: 105 };
          appConfigRef.current = nextConfig;
          setAppConfig(nextConfig);
          preloadPawnImages(nextPawns);
        })
        .catch(() => {});
    };

    start().catch((error) => {
      if (mountedRef.current) setLocationError(error?.message || "Не удалось определить геолокацию");
    });

    return () => {
      mountedRef.current = false;
      locationSubscription?.remove();
    };
  }, []);

  useEffect(() => {
    const pawnLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pawnPulse, { toValue: 1, duration: 2100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pawnPulse, { toValue: 0, duration: 2100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const locateLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(locatePulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(locatePulse, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    pawnLoop.start();
    locateLoop.start();
    return () => {
      pawnLoop.stop();
      locateLoop.stop();
    };
  }, [locatePulse, pawnPulse]);

  const startBackgroundTracking = async () => {
    const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
    if (started) return;
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 12,
      timeInterval: 10000,
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: true,
      activityType: Location.ActivityType.Fitness,
      foregroundService: {
        notificationTitle: "Tourisk сохраняет путь",
        notificationBody: "Открытая территория останется на карте.",
      },
    }).catch(() => {});
  };

  const loadLocalState = async () => {
    const [cellsRaw, openedRaw, trailRaw, locationRaw, content, playerStats, user] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.visitedCells),
      AsyncStorage.getItem(STORAGE_KEYS.openedLegendaryPlaces),
      AsyncStorage.getItem(STORAGE_KEYS.locationTrail),
      AsyncStorage.getItem(STORAGE_KEYS.lastKnownLocation),
      getGameContent(),
      getPlayerStats(),
      getStoredUser(),
    ]);

    const cells = safeJson(cellsRaw, []);
    setVisitedCells(cells);
    const parsedOpened = safeJson(openedRaw, []);
    const canonicalOpened = Array.from(new Set([
      ...parsedOpened,
      ...(playerStats.openedPlaces || []),
    ].map(canonicalLegendaryPlaceId)));
    openedPlacesRef.current = canonicalOpened;
    setOpenedPlaces(canonicalOpened);
    if (JSON.stringify(canonicalOpened) !== JSON.stringify(parsedOpened)) {
      AsyncStorage.setItem(STORAGE_KEYS.openedLegendaryPlaces, JSON.stringify(canonicalOpened)).catch(() => {});
    }

    setLiveTrail(safeJson(trailRaw, []).filter((point) => Date.now() - Number(point.timestamp || 0) < 36000).slice(-36));
    const nextPlaces = content.places || [];
    const nextPawns = content.pawns?.length ? content.pawns : DEFAULT_PAWNS;
    placesRef.current = nextPlaces;
    setPlaces(nextPlaces);
    setPawns(nextPawns);
    const nextConfig = content.appConfig || { revealRadiusMeters: 105 };
    appConfigRef.current = nextConfig;
    setAppConfig(nextConfig);
    preloadPawnImages(nextPawns);
    setStats(playerStats);

    const cachedLocation = safeJson(locationRaw, null) || user?.lastLocation;
    if (cachedLocation?.latitude != null && cachedLocation?.longitude != null) {
      const point = normalizeDeviceCoordinates({ ...cachedLocation, timestamp: cachedLocation.timestamp || Date.now() });
      lastPositionRef.current = point;
      setLocation(point);
      const cachedRegion = {
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        latitudeDelta: 0.028,
        longitudeDelta: 0.028,
      };
      setRegion(cachedRegion);
      return point;
    }
    return null;
  };

  const normalizeDeviceCoordinates = (coords) => {
    const isSimulator = Constants.isDevice === false;
    const looksLikeDefaultIosSimulator = Math.abs(Number(coords?.latitude) - 37.7858) < 1.2
      && Math.abs(Number(coords?.longitude) + 122.4064) < 1.2;
    if (isSimulator || (__DEV__ && looksLikeDefaultIosSimulator)) {
      return { ...coords, ...YEREVAN_COORDS, mocked: true, timestamp: coords.timestamp || Date.now() };
    }
    return { ...coords, timestamp: coords.timestamp || Date.now() };
  };

  const enqueuePosition = (coords, options = {}) => {
    const next = positionQueueRef.current
      .catch(() => {})
      .then(() => handlePosition(coords, options));
    positionQueueRef.current = next.catch((error) => {
      if (mountedRef.current) setLocationError(error?.message || "Ошибка обработки геолокации");
      return null;
    });
    return positionQueueRef.current;
  };

  const handlePosition = async (coords, options = {}) => {
    if (!mountedRef.current || !Number.isFinite(Number(coords?.latitude)) || !Number.isFinite(Number(coords?.longitude))) return;
    const accuracy = Number(coords.accuracy || 0);
    const timestamp = Number(coords.timestamp || Date.now());
    const previous = lastPositionRef.current;
    if (previous?.timestamp && timestamp + 2000 < Number(previous.timestamp)) return;
    if (!options.allowStale && accuracy > 150 && previous) return;

    const movement = movementMode({ ...coords, timestamp }, previous);
    const point = {
      latitude: Number(coords.latitude),
      longitude: Number(coords.longitude),
      accuracy,
      speed: movement.speed,
      transportMode: movement.mode,
      timestamp,
    };
    lastPositionRef.current = point;
    setLocation(point);
    setTransportMode(movement.mode);
    setLocationError("");
    AsyncStorage.multiSet([
      [STORAGE_KEYS.lastKnownLocation, JSON.stringify(point)],
      [STORAGE_KEYS.transportMode, movement.mode],
    ]).catch(() => {});

    if (options.centerMap) {
      const nextRegion = { ...point, latitudeDelta: 0.028, longitudeDelta: 0.028 };
      setRegion(nextRegion);
      setTimeout(() => mapRef.current?.animateToRegion(nextRegion, 520), 50);
    }

    if (movement.mode === "driving" || accuracy > MAX_EXPLORATION_ACCURACY) return;

    recordJourneyActivity({ now: new Date(point.timestamp) }).catch(() => {});
    setLiveTrail((prev) => {
      const last = prev[prev.length - 1];
      if (last) {
        const distance = DiscoveryEngine.distanceMeters(last.latitude, last.longitude, point.latitude, point.longitude);
        if (distance < 3) return prev;
      }
      const updated = [...prev, point]
        .filter((item) => Date.now() - Number(item.timestamp || 0) < 36000)
        .slice(-36);
      AsyncStorage.setItem(STORAGE_KEYS.locationTrail, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    await recordDistance(point, movement.mode);
    await revealCell(point, movement.mode);
    await discoverNearbyPlace(point);
    registerCurrentPlace(point, movement.mode).catch(() => {});
  };

  const recordDistance = async (point, mode) => {
    if (mode === "driving") return;
    const lastRaw = await AsyncStorage.getItem(STORAGE_KEYS.lastDistancePoint);
    const last = safeJson(lastRaw, null);
    await AsyncStorage.setItem(STORAGE_KEYS.lastDistancePoint, JSON.stringify(point));
    if (!last) return;

    const distance = DiscoveryEngine.distanceMeters(last.latitude, last.longitude, point.latitude, point.longitude);
    const elapsed = Math.max(1, (point.timestamp - Number(last.timestamp || point.timestamp)) / 1000);
    const inferredSpeed = distance / elapsed;
    if (distance < 2 || distance > 160 || inferredSpeed >= CAR_SPEED_MPS) return;

    const totalRaw = await AsyncStorage.getItem(STORAGE_KEYS.totalDistanceMeters);
    const total = Number(totalRaw || 0) + distance;
    await AsyncStorage.setItem(STORAGE_KEYS.totalDistanceMeters, String(total));
    await recordJourneyActivity({ distanceMeters: distance });
  };

  const registerCurrentPlace = async (coords, mode) => {
    if (mode === "driving") return;
    const previous = lastGeocodeRef.current;
    const now = Date.now();
    const moved = Number.isFinite(previous.latitude)
      ? DiscoveryEngine.distanceMeters(previous.latitude, previous.longitude, coords.latitude, coords.longitude)
      : Infinity;
    if (now - previous.timestamp < 5 * 60 * 1000 && moved < 1000) return;
    lastGeocodeRef.current = { latitude: coords.latitude, longitude: coords.longitude, timestamp: now };

    const geo = await Location.reverseGeocodeAsync({ latitude: coords.latitude, longitude: coords.longitude });
    const place = geo[0] || {};
    const city = normalizeCityName(place.city || place.subregion || place.district || "Текущая зона");
    const country = normalizeCountryName(place.country || "");
    setCurrentZone(country ? `${city}, ${country}` : city);

    const saved = await AsyncStorage.getItem(STORAGE_KEYS.checkins);
    const checkins = safeJson(saved, []);
    const alreadyVisitedCity = checkins.some((item) => normalizeCityName(item.title || item.city) === city);
    if (!alreadyVisitedCity) {
      const newCheckin = {
        id: `${Date.now()}`,
        latitude: coords.latitude,
        longitude: coords.longitude,
        title: city,
        country,
        xp: 20,
        visitedAt: new Date().toLocaleDateString("ru-RU"),
      };
      await AsyncStorage.setItem(STORAGE_KEYS.checkins, JSON.stringify([...checkins, newCheckin]));
    }

    const beforeXp = Number(stats.xp || 0);
    const data = await saveLocationProgress({
      latitude: coords.latitude,
      longitude: coords.longitude,
      cellId: GridEngine.getDistrictCellKey("world", GridEngine.getCellId(coords.latitude, coords.longitude)),
      city,
      country,
      source: "automatic_location",
      speedMps: coords.speed,
      accuracy: coords.accuracy,
      transportMode: mode,
      timestamp: coords.timestamp,
    });
    if (data?.user) {
      setStats(data.user);
      const delta = Number(data.xpDelta ?? (Number(data.user.xp || 0) - beforeXp));
      if (delta > 0) pulseXp(delta);
    }
  };

  const revealCell = async (coords, mode) => {
    const rawCell = GridEngine.getCellId(coords.latitude, coords.longitude);
    const cellId = GridEngine.getDistrictCellKey("world", rawCell);
    const revealRadiusMeters = Math.max(55, Number(appConfigRef.current?.revealRadiusMeters || 105));
    const revealedCellIds = GridEngine.getCellIdsInRadius(coords.latitude, coords.longitude, revealRadiusMeters)
      .map((value) => GridEngine.getDistrictCellKey("world", value));

    const saved = await AsyncStorage.getItem(STORAGE_KEYS.visitedCells);
    const cells = safeJson(saved, []);
    const known = new Set(cells);
    const newCellIds = revealedCellIds.filter((value) => !known.has(value));
    if (!newCellIds.length) {
      setVisitedCells(cells);
      if (Date.now() - lastProgressSyncRef.current >= 30000) {
        lastProgressSyncRef.current = Date.now();
        const data = await saveLocationProgress({
          latitude: coords.latitude,
          longitude: coords.longitude,
          cellId,
          cellIds: revealedCellIds,
          source: "gps_sync",
          speedMps: coords.speed,
          accuracy: coords.accuracy,
          transportMode: mode,
          timestamp: coords.timestamp,
        });
        if (data?.user) {
          setStats(data.user);
          if (Number(data.xpDelta || 0) > 0) pulseXp(data.xpDelta);
        }
      }
      return;
    }

    const updatedCells = [...cells, ...newCellIds];
    await AsyncStorage.setItem(STORAGE_KEYS.visitedCells, JSON.stringify(updatedCells));
    setVisitedCells(updatedCells);
    await recordJourneyActivity({ newTerritories: newCellIds.length });

    const beforeXp = Number(stats.xp || 0);
    lastProgressSyncRef.current = Date.now();
    const data = await saveLocationProgress({
      latitude: coords.latitude,
      longitude: coords.longitude,
      cellId,
      cellIds: revealedCellIds,
      source: "gps",
      speedMps: coords.speed,
      accuracy: coords.accuracy,
      transportMode: mode,
      timestamp: coords.timestamp,
    });

    if (data?.user) {
      setStats(data.user);
      setTransportMode(data.transportMode || mode);
      const delta = Number(data.xpDelta ?? (Number(data.user.xp || 0) - beforeXp));
      if (delta > 0) pulseXp(delta);
      return;
    }

    const localStats = await applyLocalExplorationReward(coords, mode, newCellIds.length);
    setStats(localStats || await getPlayerStats());
  };

  const applyLocalExplorationReward = async (coords, mode, newTerritories) => {
    const rewardRaw = await AsyncStorage.getItem(STORAGE_KEYS.lastExplorationReward);
    const lastReward = safeJson(rewardRaw, null);
    const elapsed = Date.now() - Number(lastReward?.timestamp || 0);
    const moved = lastReward
      ? DiscoveryEngine.distanceMeters(lastReward.latitude, lastReward.longitude, coords.latitude, coords.longitude)
      : Infinity;
    if (elapsed < REWARD_COOLDOWN_MS || moved < REWARD_DISTANCE_METERS) return null;

    const amount = mode === "bicycle" ? 4 : 8;
    const user = await getStoredUser();
    if (!user) return null;
    const updated = await saveUser({
      ...user,
      xp: Number(user.xp || 0) + amount,
      territories: Math.max(Number(user.territories || 0), Number(stats.territories || 0) + newTerritories),
    });
    await AsyncStorage.setItem(STORAGE_KEYS.lastExplorationReward, JSON.stringify({
      latitude: coords.latitude,
      longitude: coords.longitude,
      timestamp: Date.now(),
    }));
    pulseXp(amount);
    return { ...await getPlayerStats(), xp: updated.xp };
  };

  const pulseXp = (amount) => {
    const safeAmount = Math.max(0, Math.round(Number(amount || 0)));
    if (!safeAmount) return;
    setXpReward(safeAmount);
    setShowXp(true);
    xpAnim.setValue(0);
    Animated.sequence([
      Animated.spring(xpAnim, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
      Animated.delay(650),
      Animated.timing(xpAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start(() => setShowXp(false));
  };

  const discoverNearbyPlace = async (coords) => {
    if (discoveryLockRef.current) return;
    const latestOpened = new Set(openedPlacesRef.current.map(canonicalLegendaryPlaceId));
    const candidates = placesRef.current
      .filter((place) => !latestOpened.has(canonicalLegendaryPlaceId(place.id)))
      .map((place) => ({
        place,
        distance: DiscoveryEngine.distanceMeters(coords.latitude, coords.longitude, place.latitude, place.longitude),
      }))
      .filter(({ place, distance }) => {
        const radius = Math.max(120, Number(place.discoveryRadiusMeters || (place.rarity === "hidden" ? 135 : 280)));
        return distance <= radius;
      })
      .sort((a, b) => a.distance - b.distance);
    const candidate = candidates[0]?.place;
    if (!candidate) return;

    discoveryLockRef.current = true;
    const canonicalId = canonicalLegendaryPlaceId(candidate.id);
    const updated = Array.from(new Set([...openedPlacesRef.current, canonicalId]));
    openedPlacesRef.current = updated;
    setOpenedPlaces(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.openedLegendaryPlaces, JSON.stringify(updated));

    const beforeXp = Number(stats.xp || 0);
    const result = await savePlaceDiscovery(canonicalId);
    if (result?.user) setStats(result.user);
    if (result?.alreadyOpened) {
      discoveryLockRef.current = false;
      return;
    }

    await recordJourneyActivity({ placeId: canonicalId });
    let reward = Number(result?.xpDelta ?? (result?.user ? Number(result.user.xp || 0) - beforeXp : candidate.xp || 50));
    if (!result) {
      const localUser = await getStoredUser();
      if (localUser) {
        const savedUser = await saveUser({
          ...localUser,
          xp: Number(localUser.xp || 0) + Math.max(0, reward),
          openedPlaces: updated,
        });
        setStats({ ...await getPlayerStats(), xp: savedUser.xp });
      }
    }
    if (reward > 0) pulseXp(reward);
    setDiscoveredPlace({ ...candidate, id: canonicalId, revisiting: false });
  };

  const closeDiscovery = () => {
    setDiscoveredPlace(null);
    discoveryLockRef.current = false;
  };

  const centerOnPlayer = () => {
    if (!location) return;
    const nextRegion = {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: Math.min(region.latitudeDelta || 0.028, 0.028),
      longitudeDelta: Math.min(region.longitudeDelta || 0.028, 0.028),
    };
    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 520);
  };

  const normalizeCityName = (cityName) => {
    if (!cityName) return "Текущая зона";
    const name = cityName.trim().toLowerCase();
    if (["yerevan", "ереван", "erevan"].includes(name)) return "Ереван";
    if (["bishkek", "бишкек"].includes(name)) return "Бишкек";
    return cityName.trim();
  };

  const normalizeCountryName = (countryName) => {
    const value = String(countryName || "").trim();
    const normalized = value.toLowerCase();
    if (["kyrgyzstan", "kyrgyz republic", "киргизия", "кыргызстан", "кыргызская республика"].includes(normalized)) {
      return "Кыргызстан";
    }
    return value;
  };

  const revealRadiusMeters = Math.max(55, Number(appConfig.revealRadiusMeters || 105));
  const level = LevelEngine.getLevel(stats.xp || 0);
  const levelProgress = LevelEngine.getProgressPercent(stats.xp || 0);
  const selectedPawn = getSelectedPawn(pawns, stats.selectedPawn || "pawn_green");
  const pawnScale = pawnPulse.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.045] });
  const pawnY = pawnPulse.interpolate({ inputRange: [0, 1], outputRange: [2, -3] });
  const pawnGlowOpacity = pawnPulse.interpolate({ inputRange: [0, 1], outputRange: [0.38, 0.78] });
  const locateScale = locatePulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.12] });
  const locateOpacity = locatePulse.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.42] });
  const visibleTrail = liveTrail.slice(-32);

  if (permissionDenied) {
    return (
      <View style={styles.loading}>
        <LivingWorld source={loadingBg} fogOpacity={0.38} />
        <View style={styles.loadingCard}>
          <View style={styles.loadingIcon}><Ionicons name="location-outline" size={34} color="#dfffae" /></View>
          <Text style={styles.loadingTitle}>Нужна геолокация</Text>
          <Text style={styles.loadingText}>Разреши доступ к GPS, чтобы Tourisk мог раскрывать мир вокруг тебя.</Text>
        </View>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.loading}>
        <LivingWorld source={loadingBg} fogOpacity={0.42} />
        <View style={styles.loadingCard}>
          <View style={styles.loadingIcon}>
            <Ionicons name={locationError ? "warning-outline" : "compass"} size={34} color="#dfffae" />
          </View>
          <Text style={styles.loadingTitle}>{locationError ? "Геолокация недоступна" : "Определяем позицию"}</Text>
          <Text style={styles.loadingText}>{locationError || "Берём последнюю точку сразу, затем уточняем её по GPS."}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        customMapStyle={TouriskMapStyle}
        mapType="satellite"
        initialRegion={region}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsTraffic={false}
        showsIndoors={false}
        showsIndoorLevelPicker={false}
        showsPointsOfInterest={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        rotateEnabled={false}
        pitchEnabled={false}
        onRegionChangeComplete={setRegion}
      >
        {visibleTrail.slice(1).map((point, index) => {
          const prevPoint = visibleTrail[index];
          const opacity = Math.max(0.08, 1 - (Date.now() - point.timestamp) / 42000);
          return (
            <React.Fragment key={`trail-${point.timestamp}-${index}`}>
              <Polyline
                coordinates={[prevPoint, point]}
                strokeColor={`rgba(255, 193, 77, ${opacity * 0.24})`}
                strokeWidth={15}
                lineCap="round"
                lineJoin="round"
                zIndex={7000}
              />
              <Polyline
                coordinates={[prevPoint, point]}
                strokeColor={`rgba(255, 225, 145, ${opacity * 0.94})`}
                strokeWidth={4.5}
                lineCap="round"
                lineJoin="round"
                zIndex={7001}
              />
            </React.Fragment>
          );
        })}

        <FogOverlay
          region={region}
          visitedCells={visitedCells}
          revealRadiusMeters={revealRadiusMeters}
          currentLocation={location}
        />
        <MapFogClouds
          region={region}
          visitedCells={visitedCells}
          revealRadiusMeters={revealRadiusMeters}
          currentLocation={location}
        />

        {places.map((place) => {
          const canonicalId = canonicalLegendaryPlaceId(place.id);
          const opened = openedPlaces.includes(canonicalId);
          const revealed = FogEngine.isCoordinateRevealed(
            place.latitude,
            place.longitude,
            visitedCells,
            revealRadiusMeters + 45
          );
          if (!revealed && !opened) return null;
          if (place.rarity === "hidden" && !opened) return null;

          return (
            <Marker
              key={canonicalId}
              coordinate={{ latitude: place.latitude, longitude: place.longitude }}
              zIndex={opened ? 8700 : 7350}
              tracksViewChanges={false}
              tappable={false}
            >
              {opened ? (
                <View style={styles.openedPlaceMarker}>
                  <View style={styles.openedPlaceAura} />
                  <Text style={styles.openedPlaceSymbol}>{place.icon || "✦"}</Text>
                </View>
              ) : (
                <View style={styles.closedPlaceMarker}><Text style={styles.closedPlaceSymbol}>✦</Text></View>
              )}
            </Marker>
          );
        })}

        <Marker
          coordinate={{ latitude: location.latitude, longitude: location.longitude }}
          anchor={{ x: 0.5, y: 0.78 }}
          zIndex={99999}
          tracksViewChanges
        >
          <Animated.View style={[styles.playerMarker, { transform: [{ translateY: pawnY }, { scale: pawnScale }] }]}> 
            <Animated.View
              style={[
                styles.markerGlow,
                {
                  opacity: pawnGlowOpacity,
                  backgroundColor: selectedPawn.glowColor || "#b7ee59",
                  shadowColor: selectedPawn.glowColor || "#b7ee59",
                },
              ]}
            />
            <StaticPawn
              source={getPawnSource(selectedPawn)}
              fallbackSource={getLocalPawnFallback(selectedPawn)}
              rarity={selectedPawn.rarity}
              glowColor={selectedPawn.glowColor}
              size={122 * Number(selectedPawn.mapScale || 1)}
            />
          </Animated.View>
        </Marker>
      </MapView>

      <View pointerEvents="none" style={styles.fantasyTint} />
      <ExplorerHUD
        xp={stats.xp || 0}
        level={level}
        progress={levelProgress}
        currentLevelXp={LevelEngine.getCurrentLevelXp(stats.xp || 0)}
        nextLevelXp={LevelEngine.getXpForNextLevel(stats.xp || 0)}
        zone={currentZone}
        top={insets.top + 8}
      />

      <View pointerEvents="none" style={[styles.modeChip, { top: insets.top + 196 }, transportMode === "driving" && styles.modeChipBlocked]}>
        <Ionicons
          name={transportMode === "driving" ? "car-sport" : transportMode === "bicycle" ? "bicycle" : "walk"}
          size={15}
          color={transportMode === "driving" ? "#ffd0bb" : "#eaffc9"}
        />
        <Text style={[styles.modeText, transportMode === "driving" && styles.modeTextBlocked]}>
          {transportMode === "driving"
            ? "Поездка · исследование приостановлено"
            : transportMode === "bicycle"
              ? "Велосипед · награды снижены"
              : "Пешее исследование"}
        </Text>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Вернуться к текущей геолокации"
        style={[styles.locateButton, { top: insets.top + 235 }]}
        activeOpacity={0.86}
        onPress={centerOnPlayer}
      >
        <Animated.View pointerEvents="none" style={[styles.locateAura, { opacity: locateOpacity, transform: [{ scale: locateScale }] }]} />
        <Ionicons name="locate" size={23} color="#eaffc9" />
      </TouchableOpacity>

      <LegendaryDiscoveryCard place={discoveredPlace} onClose={closeDiscovery} autoCloseMs={12000} />

      {showXp && (
        <Animated.View
          style={[
            styles.xpPopup,
            {
              opacity: xpAnim,
              transform: [
                { translateY: xpAnim.interpolate({ inputRange: [0, 1], outputRange: [10, -58] }) },
                { scale: xpAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
              ],
            },
          ]}
        >
          <Text style={styles.xpPopupSymbol}>✦</Text>
          <Text style={styles.xpPopupText}>+{xpReward} XP</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#04120d" },
  map: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
    overflow: "hidden",
    backgroundColor: "#04120d",
  },
  loadingCard: {
    width: "100%",
    maxWidth: 360,
    padding: 24,
    borderRadius: 29,
    alignItems: "center",
    backgroundColor: "rgba(3, 24, 23, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(169,236,86,0.20)",
  },
  loadingIcon: {
    width: 66,
    height: 66,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(169,236,86,0.10)",
  },
  loadingTitle: { marginTop: 15, color: "#fff", fontSize: 26, fontWeight: "900", textAlign: "center" },
  loadingText: { marginTop: 10, color: "rgba(255,255,255,0.62)", fontSize: 14, lineHeight: 21, fontWeight: "700", textAlign: "center" },
  fantasyTint: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2, 23, 25, 0.07)" },
  playerMarker: { width: 132, height: 132, alignItems: "center", justifyContent: "center" },
  markerGlow: {
    position: "absolute",
    width: 100,
    height: 38,
    bottom: 5,
    borderRadius: 50,
    shadowOpacity: 0.95,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
    transform: [{ scaleY: 0.42 }],
  },
  closedPlaceMarker: {
    width: 39,
    height: 39,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(4, 25, 24, 0.91)",
    borderWidth: 1,
    borderColor: "rgba(244,196,81,0.55)",
  },
  closedPlaceSymbol: { color: "#f4c451", fontSize: 22, textShadowColor: "#f4c451", textShadowRadius: 10 },
  openedPlaceMarker: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(4, 25, 22, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(247, 210, 118, 0.70)",
    shadowColor: "#f4c451",
    shadowOpacity: 0.95,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  openedPlaceAura: {
    position: "absolute",
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: "rgba(244, 196, 81, 0.16)",
    shadowColor: "#f4c451",
    shadowOpacity: 0.92,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 0 },
  },
  openedPlaceSymbol: { fontSize: 18 },
  modeChip: {
    position: "absolute",
    alignSelf: "center",
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(3, 25, 23, 0.90)",
    borderWidth: 1,
    borderColor: "rgba(190,240,108,0.22)",
    zIndex: 31,
  },
  modeChipBlocked: { backgroundColor: "rgba(65, 29, 20, 0.94)", borderColor: "rgba(255,143,92,0.35)" },
  modeText: { color: "rgba(234,255,201,0.86)", fontSize: 10, fontWeight: "800" },
  modeTextBlocked: { color: "#ffd0bb" },
  locateButton: {
    position: "absolute",
    right: 15,
    width: 51,
    height: 51,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(3, 25, 23, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(190,240,108,0.28)",
    shadowColor: "#000",
    shadowOpacity: 0.36,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    zIndex: 32,
  },
  locateAura: {
    position: "absolute",
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: "#b7ee59",
    shadowColor: "#b7ee59",
    shadowOpacity: 0.8,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 0 },
  },
  xpPopup: {
    position: "absolute",
    alignSelf: "center",
    bottom: 122,
    minHeight: 43,
    paddingHorizontal: 15,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(4, 29, 24, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(244,196,81,0.38)",
    zIndex: 40,
  },
  xpPopupSymbol: { color: "#f4c451", fontSize: 20 },
  xpPopupText: { color: "#fff", fontSize: 15, fontWeight: "900" },
});
