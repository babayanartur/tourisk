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
import LivingWorld from "../components/LivingWorld";
import TouriskExplorerGlyph from "../components/TouriskExplorerGlyph";
import { DEFAULT_PAWNS, getGameContent, saveLocationProgress, savePlaceDiscovery } from "../services/gameService";
import { canonicalLegendaryPlaceId } from "../data/legendaryPlaces";
import { recordJourneyActivity } from "../services/dailyJourney";
import { getPlayerStats } from "../services/playerStats";
import { STORAGE_KEYS } from "../services/storageKeys";
import { getSelectedPawn, preloadPawnImages } from "../services/assetResolver";
import { DiscoveryEngine } from "../src/maps/services/DiscoveryEngine";
import { FogEngine } from "../src/maps/services/FogEngine";
import { GridEngine } from "../src/maps/services/GridEngine";
import { LevelEngine } from "../src/maps/services/LevelEngine";
import { TouriskMapStyle } from "../src/maps/styles/TouriskMapStyle";

const cloudRingA = require("../assets/fog/cloud-ring-a.png");
const cloudRingB = require("../assets/fog/cloud-ring-b.png");
const loadingBg = require("../assets/backgrounds/profile-world.jpg");
const BACKGROUND_LOCATION_TASK = "TOURISK_BACKGROUND_LOCATION";
const IS_EXPO_GO = Constants.executionEnvironment === "storeClient" || Constants.appOwnership === "expo";

const YEREVAN_COORDS = { latitude: 40.1811, longitude: 44.5136 };
const DEFAULT_REGION = {
  ...YEREVAN_COORDS,
  latitudeDelta: 0.032,
  longitudeDelta: 0.032,
};

if (!IS_EXPO_GO && !TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    const point = data.locations[data.locations.length - 1]?.coords;
    if (!point) return;

    const revealed = GridEngine.getCellIdsInRadius(point.latitude, point.longitude, 105)
      .map((cellId) => GridEngine.getDistrictCellKey("world", cellId));
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.visitedCells);
    const cells = saved ? JSON.parse(saved) : [];
    const merged = Array.from(new Set([...cells, ...revealed]));
    if (merged.length !== cells.length) {
      await AsyncStorage.setItem(STORAGE_KEYS.visitedCells, JSON.stringify(merged));
    }
  });
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const placesRef = useRef([]);
  const openedPlacesRef = useRef([]);
  const lastGeocodeRef = useRef({ latitude: null, longitude: null, timestamp: 0 });
  const cloudDrift = useRef(new Animated.Value(0)).current;
  const fogBreath = useRef(new Animated.Value(0)).current;
  const initialFog = useRef(new Animated.Value(1)).current;
  const xpAnim = useRef(new Animated.Value(0)).current;
  const pawnPulse = useRef(new Animated.Value(0)).current;
  const locatePulse = useRef(new Animated.Value(0)).current;

  const [location, setLocation] = useState(null);
  
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [visitedCells, setVisitedCells] = useState([]);
  const [currentCellId, setCurrentCellId] = useState(null);
  const [liveTrail, setLiveTrail] = useState([]);
  const [stats, setStats] = useState({ xp: 0, territories: 0, level: 1, selectedPawn: "pawn_green" });
  const [showXp, setShowXp] = useState(false);
  const [xpReward, setXpReward] = useState(10);
  const [discoveredPlace, setDiscoveredPlace] = useState(null);
  const [openedPlaces, setOpenedPlaces] = useState([]);
  const [places, setPlaces] = useState([]);
  const [pawns, setPawns] = useState(DEFAULT_PAWNS);
  const [appConfig, setAppConfig] = useState({ revealRadiusMeters: 105 });
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [currentZone, setCurrentZone] = useState("Ереван, Армения");

  useEffect(() => {
    let locationSubscription;
    let mounted = true;

    const start = async () => {
      await loadLocalState();

      const foreground = await Location.requestForegroundPermissionsAsync();
      if (foreground.status !== "granted") {
        setPermissionDenied(true);
        return;
      }

      if (!IS_EXPO_GO) {
        try {
          const background = await Location.requestBackgroundPermissionsAsync();
          if (background.status === "granted") await startBackgroundTracking();
        } catch (error) {
          console.log("Background location permission skipped:", error?.message);
        }
      }

      let current = await Location.getLastKnownPositionAsync({ maxAge: 60000, requiredAccuracy: 500 }).catch(() => null);
      if (!current) {
        current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }
      if (!mounted || !current?.coords) return;

      const startupCoords = normalizeDeviceCoordinates(current.coords);
      await handlePosition(startupCoords, { centerMap: true });
      Animated.timing(initialFog, {
        toValue: 0,
        duration: 2800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 3, timeInterval: 1400 },
        (position) => handlePosition(normalizeDeviceCoordinates(position.coords), { centerMap: false })
      );
    };

    start().catch((error) => {
      console.log("Location startup failed:", error?.message);
      if (mounted) setLocationError(error?.message || "Не удалось определить геолокацию");
    });

    return () => {
      mounted = false;
      locationSubscription?.remove();
    };
  }, [initialFog]);

  useEffect(() => {
    const cloudLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(cloudDrift, {
          toValue: 1,
          duration: 14500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(cloudDrift, {
          toValue: 0,
          duration: 14500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const fogLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(fogBreath, { toValue: 1, duration: 5200, useNativeDriver: true }),
        Animated.timing(fogBreath, { toValue: 0, duration: 5200, useNativeDriver: true }),
      ])
    );
    const pawnLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pawnPulse, { toValue: 1, duration: 2100, useNativeDriver: true }),
        Animated.timing(pawnPulse, { toValue: 0, duration: 2100, useNativeDriver: true }),
      ])
    );
    const locateLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(locatePulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(locatePulse, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );

    cloudLoop.start();
    fogLoop.start();
    pawnLoop.start();
    locateLoop.start();

    return () => {
      cloudLoop.stop();
      fogLoop.stop();
      pawnLoop.stop();
      locateLoop.stop();
    };
  }, [cloudDrift, fogBreath, locatePulse, pawnPulse]);

  const startBackgroundTracking = async () => {
    const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
    if (started) return;

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 12,
      timeInterval: 10000,
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: true,
      foregroundService: {
        notificationTitle: "Tourisk исследует путь",
        notificationBody: "Карта открывается по вашему маршруту.",
      },
    }).catch((error) => console.log("Background tracking skipped:", error?.message));
  };

  const loadLocalState = async () => {
    const [cellsRaw, openedRaw, trailRaw, content, playerStats] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.visitedCells),
      AsyncStorage.getItem(STORAGE_KEYS.openedLegendaryPlaces),
      AsyncStorage.getItem(STORAGE_KEYS.locationTrail),
      getGameContent(),
      getPlayerStats(),
    ]);

    if (cellsRaw) setVisitedCells(JSON.parse(cellsRaw));
    const parsedOpened = openedRaw ? JSON.parse(openedRaw) : [];
    const canonicalOpened = Array.from(new Set([
      ...parsedOpened,
      ...(playerStats.openedPlaces || []),
    ].map(canonicalLegendaryPlaceId)));
    openedPlacesRef.current = canonicalOpened;
    setOpenedPlaces(canonicalOpened);
    if (JSON.stringify(canonicalOpened) !== JSON.stringify(parsedOpened)) {
      await AsyncStorage.setItem(STORAGE_KEYS.openedLegendaryPlaces, JSON.stringify(canonicalOpened));
    }
    if (trailRaw) setLiveTrail(JSON.parse(trailRaw));
    placesRef.current = content.places || [];
    setPlaces(content.places || []);
    setPawns(content.pawns?.length ? content.pawns : DEFAULT_PAWNS);
    setAppConfig(content.appConfig || { revealRadiusMeters: 105 });
    preloadPawnImages(content.pawns?.length ? content.pawns : DEFAULT_PAWNS);
    setStats(playerStats);
  };

  const normalizeDeviceCoordinates = (coords) => {
    const isSimulator = Constants.isDevice === false;
    const looksLikeDefaultIosSimulator = Math.abs(Number(coords?.latitude) - 37.7858) < 1.2
      && Math.abs(Number(coords?.longitude) + 122.4064) < 1.2;
    if (isSimulator || (__DEV__ && looksLikeDefaultIosSimulator)) {
      return { ...coords, ...YEREVAN_COORDS, mocked: true };
    }
    return coords;
  };

  const handlePosition = async (coords, options = {}) => {
    const point = { latitude: coords.latitude, longitude: coords.longitude, timestamp: Date.now() };
    setLocation(coords);
    recordJourneyActivity({ now: new Date(point.timestamp) }).catch(() => {});

    const nextRegion = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta: 0.028,
      longitudeDelta: 0.028,
    };
    setRegion(nextRegion);

    if (options.centerMap && mapRef.current) mapRef.current.animateToRegion(nextRegion, 700);

    setLiveTrail((prev) => {
      const last = prev[prev.length - 1];
      if (last) {
        const distance = DiscoveryEngine.distanceMeters(last.latitude, last.longitude, point.latitude, point.longitude);
        if (distance < 3) return prev;
      }
      const now = Date.now();
      const updated = [...prev, point].filter((item) => now - item.timestamp < 42000).slice(-55);
      AsyncStorage.setItem(STORAGE_KEYS.locationTrail, JSON.stringify(updated));
      return updated;
    });

    await recordDistance(point);
    await revealCell(coords);
    discoverNearbyPlace(coords);
    registerCurrentPlace(coords);
  };

  const recordDistance = async (point) => {
    const lastRaw = await AsyncStorage.getItem(STORAGE_KEYS.lastDistancePoint);
    const last = lastRaw ? JSON.parse(lastRaw) : null;
    await AsyncStorage.setItem(STORAGE_KEYS.lastDistancePoint, JSON.stringify(point));
    if (!last) return;

    const distance = DiscoveryEngine.distanceMeters(last.latitude, last.longitude, point.latitude, point.longitude);
    if (distance < 2 || distance > 500) return;

    const totalRaw = await AsyncStorage.getItem(STORAGE_KEYS.totalDistanceMeters);
    const total = Number(totalRaw || 0) + distance;
    await AsyncStorage.setItem(STORAGE_KEYS.totalDistanceMeters, String(total));
    await recordJourneyActivity({ distanceMeters: distance });
  };

  const registerCurrentPlace = async (coords) => {
    const previous = lastGeocodeRef.current;
    const now = Date.now();
    const moved = Number.isFinite(previous.latitude)
      ? DiscoveryEngine.distanceMeters(previous.latitude, previous.longitude, coords.latitude, coords.longitude)
      : Infinity;
    if (now - previous.timestamp < 5 * 60 * 1000 && moved < 1000) return;

    lastGeocodeRef.current = { latitude: coords.latitude, longitude: coords.longitude, timestamp: now };

    try {
      const geo = await Location.reverseGeocodeAsync({ latitude: coords.latitude, longitude: coords.longitude });
      const place = geo[0] || {};
      const city = normalizeCityName(place.city || place.subregion || place.district || "Текущая зона");
      const country = normalizeCountryName(place.country || "");
      setCurrentZone(country ? `${city}, ${country}` : city);
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.checkins);
      const checkins = saved ? JSON.parse(saved) : [];
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

      const data = await saveLocationProgress({
        latitude: coords.latitude,
        longitude: coords.longitude,
        cellId: GridEngine.getDistrictCellKey("world", GridEngine.getCellId(coords.latitude, coords.longitude)),
        city,
        country,
        source: "automatic_location",
      });
      if (data?.user) setStats(data.user);
    } catch (error) {
      console.log("Reverse geocoding skipped:", error?.message);
    }
  };

  const revealCell = async (coords) => {
    const rawCell = GridEngine.getCellId(coords.latitude, coords.longitude);
    const cellId = GridEngine.getDistrictCellKey("world", rawCell);
    const revealRadiusMeters = Math.max(55, Number(appConfig.revealRadiusMeters || 105));
    const revealedCellIds = GridEngine.getCellIdsInRadius(coords.latitude, coords.longitude, revealRadiusMeters)
      .map((value) => GridEngine.getDistrictCellKey("world", value));
    setCurrentCellId(cellId);

    const saved = await AsyncStorage.getItem(STORAGE_KEYS.visitedCells);
    const cells = saved ? JSON.parse(saved) : [];
    const known = new Set(cells);
    const newCellIds = revealedCellIds.filter((value) => !known.has(value));
    if (!newCellIds.length) {
      setVisitedCells(cells);
      return;
    }

    const updatedCells = [...cells, ...newCellIds];
    await AsyncStorage.setItem(STORAGE_KEYS.visitedCells, JSON.stringify(updatedCells));
    setVisitedCells(updatedCells);
    pulseXp(10);
    await recordJourneyActivity({ newTerritories: newCellIds.length });

    const data = await saveLocationProgress({
      latitude: coords.latitude,
      longitude: coords.longitude,
      cellId,
      cellIds: revealedCellIds,
      source: "gps",
    });
    setStats(data?.user || (await getPlayerStats()));
  };

  const pulseXp = (amount = 10) => {
    setXpReward(Math.max(0, Number(amount || 0)));
    setShowXp(true);
    xpAnim.setValue(0);
    Animated.sequence([
      Animated.spring(xpAnim, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
      Animated.delay(650),
      Animated.timing(xpAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start(() => setShowXp(false));
  };

  const discoverNearbyPlace = async (coords) => {
    const latestPlaces = placesRef.current;
    const latestOpenedPlaces = openedPlacesRef.current;
    const hidden = latestPlaces.find((place) => {
      if (latestOpenedPlaces.includes(place.id)) return false;
      const distance = DiscoveryEngine.distanceMeters(coords.latitude, coords.longitude, place.latitude, place.longitude);
      const discoveryRadius = Math.max(80, Number(place.discoveryRadiusMeters || (place.rarity === "hidden" ? 105 : 220)));
      return distance <= discoveryRadius;
    });
    if (!hidden) return;

    const updated = [...latestOpenedPlaces, hidden.id];
    openedPlacesRef.current = updated;
    setOpenedPlaces(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.openedLegendaryPlaces, JSON.stringify(updated));
    const discoveryResult = await savePlaceDiscovery(hidden.id);
    if (discoveryResult?.user) setStats(discoveryResult.user);
    const alreadyOpenedOnServer = Boolean(discoveryResult?.alreadyOpened);
    setDiscoveredPlace({ ...hidden, revisiting: alreadyOpenedOnServer });
    if (!alreadyOpenedOnServer) {
      await recordJourneyActivity({ placeId: hidden.id });
      pulseXp(hidden.xp || 50);
    }
  };

  const centerOnPlayer = () => {
    if (!location) return;
    const nextRegion = {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: Math.min(region.latitudeDelta || 0.028, 0.028),
      longitudeDelta: Math.min(region.longitudeDelta || 0.028, 0.028),
    };
    mapRef.current?.animateToRegion(nextRegion, 620);
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

  const cloudShift = cloudDrift.interpolate({ inputRange: [0, 1], outputRange: [-58, 58] });
  const cloudShiftReverse = cloudDrift.interpolate({ inputRange: [0, 1], outputRange: [48, -62] });
  const fogScale = fogBreath.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.08] });
  const fogOpacity = fogBreath.interpolate({ inputRange: [0, 1], outputRange: [0.66, 0.88] });
  const fullCoverOpacity = initialFog.interpolate({ inputRange: [0, 1], outputRange: [0, 0.88] });
  const pawnScale = pawnPulse.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.055] });
  const pawnY = pawnPulse.interpolate({ inputRange: [0, 1], outputRange: [1, -3] });
  const pawnGlowOpacity = pawnPulse.interpolate({ inputRange: [0, 1], outputRange: [0.30, 0.72] });
  const locateScale = locatePulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.12] });
  const locateOpacity = locatePulse.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.42] });

  if (permissionDenied) {
    return (
      <View style={styles.loading}>
        <LivingWorld source={loadingBg} fogOpacity={0.38} />
        <View style={styles.loadingCard}>
          <View style={styles.loadingIcon}>
            <Ionicons name="location-outline" size={34} color="#dfffae" />
          </View>
          <Text style={styles.loadingTitle}>Нужна геолокация</Text>
          <Text style={styles.loadingText}>Разреши доступ к GPS, чтобы Tourisk мог раскрывать мир вокруг тебя.</Text>
        </View>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.loading}>
        <LivingWorld source={loadingBg} fogOpacity={0.46} />
        <View style={styles.loadingCard}>
          <View style={styles.loadingIcon}>
            <Ionicons name={locationError ? "warning-outline" : "compass"} size={34} color="#dfffae" />
          </View>
          <Text style={styles.loadingTitle}>{locationError ? "Геолокация недоступна" : "Мир скрыт туманом"}</Text>
          <Text style={styles.loadingText}>
            {locationError
              ? "Включи геолокацию в симуляторе или на устройстве и открой карту заново."
              : "Определяем твою позицию и готовим живую карту."}
          </Text>
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
        {liveTrail.slice(1).map((point, index) => {
          const prevPoint = liveTrail[index];
          const age = Date.now() - point.timestamp;
          const opacity = Math.max(0.08, 1 - age / 42000);
          return (
            <React.Fragment key={`trail-${point.timestamp}-${index}`}>
              <Polyline
                coordinates={[prevPoint, point]}
                strokeColor={`rgba(255, 193, 77, ${opacity * 0.24})`}
                strokeWidth={15}
                lineCap="round"
                lineJoin="round"
                zIndex={8099}
              />
              <Polyline
                coordinates={[prevPoint, point]}
                strokeColor={`rgba(255, 225, 145, ${opacity * 0.94})`}
                strokeWidth={4.5}
                lineCap="round"
                lineJoin="round"
                zIndex={8100}
              />
            </React.Fragment>
          );
        })}

        <FogOverlay
          region={region}
          visitedCells={visitedCells}
          currentLocation={{ latitude: location.latitude, longitude: location.longitude }}
          revealRadiusMeters={revealRadiusMeters}
        />

        {places.map((place) => {
          const opened = openedPlaces.includes(place.id);
          const revealed = FogEngine.isCoordinateRevealed(
            place.latitude,
            place.longitude,
            visitedCells,
            revealRadiusMeters + 35
          );
          if (!revealed && !opened) return null;
          if (place.rarity === "hidden" && !opened) return null;

          return (
            <Marker
              key={place.id}
              coordinate={{ latitude: place.latitude, longitude: place.longitude }}
              zIndex={opened ? 8700 : 7350}
              tracksViewChanges={false}
              onPress={() => {
                if (opened) setDiscoveredPlace({ ...place, revisiting: true });
              }}
            >
              {opened ? (
                <View style={styles.openedPlaceMarker}>
                  <View style={styles.openedPlaceAura} />
                  <Text style={styles.openedPlaceSymbol}>{place.icon || "✦"}</Text>
                </View>
              ) : (
                <View style={styles.closedPlaceMarker}>
                  <Text style={styles.closedPlaceSymbol}>✦</Text>
                </View>
              )}
            </Marker>
          );
        })}

        <Marker
          coordinate={{ latitude: location.latitude, longitude: location.longitude }}
          anchor={{ x: 0.5, y: 0.76 }}
          zIndex={9999}
        >
          <Animated.View style={{ transform: [{ translateY: pawnY }, { scale: pawnScale }] }}>
            <Animated.View
              style={[
                styles.markerGlow,
                {
                  opacity: pawnGlowOpacity,
                  backgroundColor: selectedPawn.glowColor || (selectedPawn.rarity === "legendary" ? "#f4c451" : "#b7ee59"),
                },
              ]}
            />
            <TouriskExplorerGlyph
              size={82 * Number(selectedPawn.mapScale || 1)}
              color={selectedPawn.glowColor || "#b7ee59"}
            />
          </Animated.View>
        </Marker>
      </MapView>
<TouriskDiscoveryCard
  visible={showDiscoveryCard}
  discovery={currentDiscovery}
  onHide={() => {
    setShowDiscoveryCard(false);
    setCurrentDiscovery(null);
  }}
/>
      <View pointerEvents="none" style={styles.fantasyTint} />
      <Animated.Image
        source={cloudRingA}
        pointerEvents="none"
        style={[
          styles.cloudRing,
          {
            opacity: fogOpacity,
            transform: [{ translateX: cloudShift }, { scale: fogScale }],
          },
        ]}
      />
      <Animated.Image
        source={cloudRingB}
        pointerEvents="none"
        style={[
          styles.cloudRingSecond,
          {
            opacity: fogBreath.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.46] }),
            transform: [{ translateX: cloudShiftReverse }, { scale: fogBreath.interpolate({ inputRange: [0, 1], outputRange: [1.08, 0.98] }) }],
          },
        ]}
      />
      <Animated.View pointerEvents="none" style={[styles.initialFogCover, { opacity: fullCoverOpacity }]} />

      <ExplorerHUD
        xp={stats.xp || 0}
        level={level}
        progress={levelProgress}
        currentLevelXp={LevelEngine.getCurrentLevelXp(stats.xp || 0)}
        nextLevelXp={LevelEngine.getXpForNextLevel()}
        zone={currentZone}
        top={insets.top + 8}
      />

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Вернуться к текущей геолокации"
        style={[styles.locateButton, { top: insets.top + 210 }]}
        activeOpacity={0.86}
        onPress={centerOnPlayer}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.locateAura,
            { opacity: locateOpacity, transform: [{ scale: locateScale }] },
          ]}
        />
        <Ionicons name="locate" size={23} color="#eaffc9" />
      </TouchableOpacity>

      <LegendaryDiscoveryCard place={discoveredPlace} onClose={() => setDiscoveredPlace(null)} />

      {showXp && (
        <Animated.View
          style={[
            styles.xpPopup,
            {
              opacity: xpAnim,
              transform: [
                {
                  translateY: xpAnim.interpolate({ inputRange: [0, 1], outputRange: [10, -58] }),
                },
                {
                  scale: xpAnim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }),
                },
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
  container: {
    flex: 1,
    backgroundColor: "#04120d",
  },
  map: {
    flex: 1,
  },
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
  loadingTitle: {
    marginTop: 15,
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "rgba(255,255,255,0.62)",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    textAlign: "center",
  },
  fantasyTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 23, 25, 0.07)",
  },
  cloudRing: {
    position: "absolute",
    top: 112,
    left: "-10%",
    width: "120%",
    height: "88%",
    resizeMode: "stretch",
    zIndex: 8,
  },
  cloudRingSecond: {
    position: "absolute",
    top: 126,
    left: "-14%",
    width: "128%",
    height: "90%",
    resizeMode: "stretch",
    zIndex: 9,
  },
  initialFogCover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(190, 201, 194, 0.82)",
    zIndex: 12,
  },
  markerGlow: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 8,
    height: 20,
    borderRadius: 20,
    shadowColor: "#caff4a",
    shadowOpacity: 0.9,
    shadowRadius: 17,
    shadowOffset: { width: 0, height: 0 },
  },
  playerPawnFallback: {
    width: 86,
    height: 86,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 68,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowRadius: 8,
  },
  playerPawn: {
    width: 76,
    height: 76,
    resizeMode: "contain",
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
    shadowColor: "#f4c451",
    shadowOpacity: 0.65,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 0 },
  },
  closedPlaceSymbol: {
    color: "#f4c451",
    fontSize: 22,
    textShadowColor: "#f4c451",
    textShadowRadius: 10,
  },
  openedPlaceMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(4, 25, 22, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(247, 210, 118, 0.58)",
    shadowColor: "#f4c451",
    shadowOpacity: 0.72,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  openedPlaceAura: {
    position: "absolute",
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: "rgba(244, 196, 81, 0.12)",
    shadowColor: "#f4c451",
    shadowOpacity: 0.72,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  openedPlaceSymbol: {
    fontSize: 17,
  },
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
    zIndex: 22,
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
  exploreButton: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 103,
    minHeight: 68,
    paddingHorizontal: 10,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(40, 100, 36, 0.97)",
    borderWidth: 1,
    borderColor: "rgba(207,255,114,0.55)",
    shadowColor: "#8fdb45",
    shadowOpacity: 0.38,
    shadowRadius: 19,
    shadowOffset: { width: 0, height: 9 },
    zIndex: 21,
  },
  exploreButtonDisabled: {
    opacity: 0.68,
  },
  exploreIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#b7ee59",
  },
  exploreSymbol: {
    color: "#0a160c",
    fontSize: 25,
    fontWeight: "900",
  },
  exploreCopy: {
    flex: 1,
    marginLeft: 11,
  },
  exploreTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
  },
  exploreSubtitle: {
    marginTop: 3,
    color: "rgba(255,255,255,0.55)",
    fontSize: 9,
    fontWeight: "700",
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
    zIndex: 26,
  },
  xpPopupSymbol: {
    color: "#f4c451",
    fontSize: 20,
  },
  xpPopupText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
});
