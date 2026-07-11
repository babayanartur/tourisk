import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapView, { Circle, Marker, Polygon, Polyline } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TouriskDiscoveryCard from "../components/discovery/TouriskDiscoveryCard";
import { getAnyDiscoveryById } from "../data/discoveryService";
import DiscoveryNotification from "../components/DiscoveryNotification";
import ExplorerHUD from "../components/ExplorerHUD";
import FogOverlay from "../components/FogOverlay";
import { DEFAULT_PAWNS, getGameContent, saveLocationProgress } from "../services/gameService";
import { getPlayerStats } from "../services/playerStats";
import { STORAGE_KEYS } from "../services/storageKeys";
import { getSelectedPawnSource, preloadPawnImages } from "../services/assetResolver";
import { DiscoveryEngine } from "../src/maps/services/DiscoveryEngine";
import { FogEngine } from "../src/maps/services/FogEngine";
import { GridEngine } from "../src/maps/services/GridEngine";
import { LevelEngine } from "../src/maps/services/LevelEngine";
import { TerritoryEngine } from "../src/maps/services/TerritoryEngine";
import { TouriskMapStyle } from "../src/maps/styles/TouriskMapStyle";

const fogDay = require("../assets/fog/fog_day_01.png");
const fogNight = require("../assets/fog/fog_night_01.png");
const BACKGROUND_LOCATION_TASK = "TOURISK_BACKGROUND_LOCATION";

const DEFAULT_REGION = {
  latitude: 40.1872,
  longitude: 44.5152,
  latitudeDelta: 0.036,
  longitudeDelta: 0.036,
};

if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    const point = data.locations[data.locations.length - 1]?.coords;
    if (!point) return;

    const rawCell = GridEngine.getCellId(point.latitude, point.longitude);
    const cellId = GridEngine.getDistrictCellKey("world", rawCell);
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.visitedCells);
    const cells = saved ? JSON.parse(saved) : [];
    if (!cells.includes(cellId)) {
      await AsyncStorage.setItem(STORAGE_KEYS.visitedCells, JSON.stringify([...cells, cellId]));
    }
  });
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const cloudDrift = useRef(new Animated.Value(0)).current;
  const xpAnim = useRef(new Animated.Value(0)).current;
  const pawnPulse = useRef(new Animated.Value(0)).current;
  const [location, setLocation] = useState(null);
  
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [visitedCells, setVisitedCells] = useState([]);
  const [currentCellId, setCurrentCellId] = useState(null);
  const [liveTrail, setLiveTrail] = useState([]);
  const [stats, setStats] = useState({ xp: 0, territories: 0, level: 1, selectedPawn: "pawn_green" });
  const [showXp, setShowXp] = useState(false);
const [showDiscoveryCard, setShowDiscoveryCard] = useState(false);
const [currentDiscovery, setCurrentDiscovery] = useState(null);
  const [discoveredPlace, setDiscoveredPlace] = useState(null);
  const [openedPlaces, setOpenedPlaces] = useState([]);
  const [places, setPlaces] = useState([]);
  const [pawns, setPawns] = useState(DEFAULT_PAWNS);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isExploring, setIsExploring] = useState(false);

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

      try {
        const background = await Location.requestBackgroundPermissionsAsync();
        if (background.status === "granted") await startBackgroundTracking();
      } catch (error) {
        console.log("Background location permission skipped:", error?.message);
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!mounted) return;

      handlePosition(current.coords, { centerMap: true });

      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 3, timeInterval: 1200 },
        (position) => handlePosition(position.coords, { centerMap: false })
      );
    };

    start();

    return () => {
      mounted = false;
      if (locationSubscription) locationSubscription.remove();
    };
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(cloudDrift, { toValue: 1, duration: 9000, useNativeDriver: true }),
        Animated.timing(cloudDrift, { toValue: 0, duration: 9000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pawnPulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pawnPulse, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, [cloudDrift, pawnPulse]);

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
    if (openedRaw) setOpenedPlaces(JSON.parse(openedRaw));
    if (trailRaw) setLiveTrail(JSON.parse(trailRaw));
    setPlaces(content.places || []);
    setPawns(content.pawns || DEFAULT_PAWNS);
    preloadPawnImages(content.pawns || DEFAULT_PAWNS);
    setStats(playerStats);
  };

  const handlePosition = async (coords, options = {}) => {
    const point = { latitude: coords.latitude, longitude: coords.longitude, timestamp: Date.now() };
    setLocation(coords);

    const nextRegion = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta: 0.028,
      longitudeDelta: 0.028,
    };
    setRegion(nextRegion);

    if (options.centerMap && mapRef.current) mapRef.current.animateToRegion(nextRegion, 650);

    setLiveTrail((prev) => {
      const last = prev[prev.length - 1];
      if (last) {
        const distance = DiscoveryEngine.distanceMeters(last.latitude, last.longitude, point.latitude, point.longitude);
        if (distance < 3) return prev;
      }
      const now = Date.now();
      const updated = [...prev, point].filter((item) => now - item.timestamp < 28000).slice(-40);
      AsyncStorage.setItem(STORAGE_KEYS.locationTrail, JSON.stringify(updated));
      return updated;
    });

    await revealCell(coords);
    discoverNearbyPlace(coords);
  };

  const revealCell = async (coords) => {
    const rawCell = GridEngine.getCellId(coords.latitude, coords.longitude);
    const cellId = GridEngine.getDistrictCellKey("world", rawCell);
    setCurrentCellId(cellId);

    const saved = await AsyncStorage.getItem(STORAGE_KEYS.visitedCells);
    const cells = saved ? JSON.parse(saved) : [];
    if (cells.includes(cellId)) {
      setVisitedCells(cells);
      return;
    }

    const updatedCells = [...cells, cellId];
    await AsyncStorage.setItem(STORAGE_KEYS.visitedCells, JSON.stringify(updatedCells));
    setVisitedCells(updatedCells);
    pulseXp();

    const data = await saveLocationProgress({ latitude: coords.latitude, longitude: coords.longitude, cellId, source: "gps" });
    const freshStats = data?.user || (await getPlayerStats());
    setStats(freshStats);
  };

  const pulseXp = () => {
    setShowXp(true);
    xpAnim.setValue(0);
    Animated.timing(xpAnim, { toValue: 1, duration: 1250, useNativeDriver: true }).start(() => setShowXp(false));
  };

  const discoverNearbyPlace = async (coords) => {
    const hidden = places.find((place) => {
      if (openedPlaces.includes(place.id)) return false;
      const distance = DiscoveryEngine.distanceMeters(coords.latitude, coords.longitude, place.latitude, place.longitude);
      return distance <= 220;
    });
    if (!hidden) return;

    const updated = [...openedPlaces, hidden.id];
    setOpenedPlaces(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.openedLegendaryPlaces, JSON.stringify(updated));
    setDiscoveredPlace(hidden);


    const discovery = getAnyDiscoveryById(hidden.id);
    
if (discovery) {
  setCurrentDiscovery(discovery);
  setShowDiscoveryCard(true);
}

pulseXp();

    setTimeout(() => setDiscoveredPlace(null), 3200);
  };

  const handleExplore = async () => {
    if (!location || isExploring) return;
    setIsExploring(true);

    try {
      const geo = await Location.reverseGeocodeAsync({ latitude: location.latitude, longitude: location.longitude });
      const place = geo[0] || {};
      const city = normalizeCityName(place.city || place.subregion || "Неизвестный город");
      const country = place.country || "Неизвестная страна";
      const newCheckin = {
        id: `${Date.now()}`,
        latitude: location.latitude,
        longitude: location.longitude,
        title: city,
        country,
        xp: 20,
        visitedAt: new Date().toLocaleDateString("ru-RU"),
      };

      const saved = await AsyncStorage.getItem(STORAGE_KEYS.checkins);
      const checkins = saved ? JSON.parse(saved) : [];
      const alreadyVisitedCity = checkins.some((item) => normalizeCityName(item.title || item.city) === city);
      const updatedCheckins = alreadyVisitedCity ? checkins : [...checkins, newCheckin];
      await AsyncStorage.setItem(STORAGE_KEYS.checkins, JSON.stringify(updatedCheckins));

      const data = await saveLocationProgress({ latitude: location.latitude, longitude: location.longitude, cellId: currentCellId, city, country, source: "manual_checkin" });
      setStats(data?.user || (await getPlayerStats()));
      pulseXp();
      Alert.alert("Исследование", alreadyVisitedCity ? "Эта точка уже в истории. Маршрут всё равно продолжает открывать карту." : `${city}, ${country}\n+20 XP`);
    } catch (error) {
      Alert.alert("Карта", error.message || "Не удалось выполнить исследование.");
    } finally {
      setIsExploring(false);
    }
  };

  const normalizeCityName = (cityName) => {
    if (!cityName) return "Unknown";
    const name = cityName.trim().toLowerCase();
    if (["yerevan", "ереван", "erevan"].includes(name)) return "Ереван";
    return cityName.trim();
  };

  const fogPolygons = useMemo(() => {
    const nearbyFogCells = FogEngine.getFogCellsAroundLocation(currentCellId, 11);
    const hiddenFogCells = FogEngine.getHiddenCells(nearbyFogCells, visitedCells);
    return FogEngine.buildFogPolygons(hiddenFogCells);
  }, [currentCellId, visitedCells]);

  const territoryPolygons = useMemo(() => TerritoryEngine.getOutlineTerritoryPolygons(visitedCells), [visitedCells]);
  const level = LevelEngine.getLevel(stats.xp || 0);
  const remainingXp = LevelEngine.getRemainingXp(stats.xp || 0);
  const levelProgress = LevelEngine.getProgressPercent(stats.xp || 0);
  const title = LevelEngine.getTitle(level);
  const cloudShift = cloudDrift.interpolate({ inputRange: [0, 1], outputRange: [-34, 34] });
  const pawnSource = getSelectedPawnSource(pawns, stats.selectedPawn || "pawn_green");
  const pawnScale = pawnPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const pawnGlowOpacity = pawnPulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.74] });

  if (permissionDenied) {
    return (
      <View style={styles.loading}>
        <Ionicons name="location-outline" size={42} color="#a9ec56" />
        <Text style={styles.loadingTitle}>Нужна геолокация</Text>
        <Text style={styles.loadingText}>Без GPS карта не откроется. Туристическое приложение без локации, конечно, было бы комедией, но мы не настолько отчаялись.</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.loading}>
        <Ionicons name="map-outline" size={42} color="#a9ec56" />
        <Text style={styles.loadingTitle}>Загружаем карту...</Text>
        <Text style={styles.loadingText}>Ищем твою позицию и готовим туман. Спутники тоже иногда делают вид, что заняты.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        customMapStyle={TouriskMapStyle}
        initialRegion={region}
        showsUserLocation={false}
        showsCompass={false}
        showsPointsOfInterest={false}
        onRegionChangeComplete={setRegion}
      >
        {territoryPolygons.map((territory) => (
          <Polygon
            key={`${territory.id}-${visitedCells.length}`}
            coordinates={territory.coordinates}
            fillColor="rgba(162, 221, 74, 0.16)"
            strokeColor="rgba(199, 245, 82, 0.58)"
            strokeWidth={2}
            zIndex={6000}
          />
        ))}

        {liveTrail.slice(1).map((point, index) => {
          const prevPoint = liveTrail[index];
          const age = Date.now() - point.timestamp;
          const opacity = Math.max(0.08, 1 - age / 28000);
          return (
            <Polyline
              key={`trail-${point.timestamp}-${index}`}
              coordinates={[prevPoint, point]}
              strokeColor={`rgba(255, 218, 102, ${opacity})`}
              strokeWidth={8}
              lineCap="round"
              lineJoin="round"
              zIndex={8100}
            />
          );
        })}

        <Circle
          center={{ latitude: location.latitude, longitude: location.longitude }}
          radius={145}
          fillColor="rgba(169,236,86,0.13)"
          strokeColor="rgba(216,255,94,0.54)"
          strokeWidth={2}
          zIndex={8200}
        />

        <FogOverlay fogPolygons={fogPolygons} />

        {places.map((place) => {
          const opened = openedPlaces.includes(place.id);
          return (
            <Marker key={place.id} coordinate={{ latitude: place.latitude, longitude: place.longitude }} zIndex={opened ? 8500 : 7200}>
              <View style={[styles.placeMarker, opened && styles.placeMarkerOpened]}>
                <Text style={styles.placeText}>{opened ? "🏛" : "✦"}</Text>
              </View>
            </Marker>
          );
        })}

        <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }} anchor={{ x: 0.5, y: 0.78 }} zIndex={9999}>
          <Animated.View style={{ transform: [{ scale: pawnScale }] }}>
            <Animated.View style={[styles.markerGlow, { opacity: pawnGlowOpacity }]} />
            <Image source={pawnSource} style={styles.playerPawn} />
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
      <Animated.Image source={fogDay} pointerEvents="none" style={[styles.topCloud, { transform: [{ translateX: cloudShift }] }]} />
      <Animated.Image source={fogNight} pointerEvents="none" style={[styles.bottomCloud, { transform: [{ translateX: Animated.multiply(cloudShift, -1) }, { rotate: "180deg" }] }]} />

      <ExplorerHUD xp={stats.xp || 0} territories={visitedCells.length} level={level} remainingXp={remainingXp} title={title} progress={levelProgress} />

      <View style={[styles.mapButtons, { top: insets.top + 152 }]}>
        <TouchableOpacity style={styles.roundButton} activeOpacity={0.85} onPress={() => mapRef.current?.animateToRegion(region, 500)}>
          <Ionicons name="navigate" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.roundButton} activeOpacity={0.85}>
          <Ionicons name="layers" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.roundButton} activeOpacity={0.85}>
          <Ionicons name="locate" size={23} color="#fff" />
        </TouchableOpacity>
      </View>

      <DiscoveryNotification place={discoveredPlace} />

      {showXp && (
        <Animated.View style={[styles.xpPopup, { opacity: xpAnim, transform: [{ translateY: xpAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -78] }) }] }]}>
          <Text style={styles.xpPopupText}>⭐ +10 XP</Text>
        </Animated.View>
      )}

      <TouchableOpacity activeOpacity={0.92} style={styles.button} onPress={handleExplore}>
        <Ionicons name="compass" size={24} color="#fff" />
        <Text style={styles.buttonText}>{isExploring ? "Исследуем..." : "Исследовать"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#04120d" },
  map: { flex: 1 },
  loading: {
    flex: 1,
    backgroundColor: "#04120d",
    alignItems: "center",
    justifyContent: "center",
    padding: 26,
  },
  loadingTitle: {
    marginTop: 14,
    color: "#fff",
    fontSize: 27,
    fontWeight: "900",
    textAlign: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "rgba(255,255,255,0.68)",
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "700",
    textAlign: "center",
  },
  fantasyTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 23, 25, 0.08)",
  },
  topCloud: {
    position: "absolute",
    top: -72,
    left: -110,
    width: "160%",
    height: 240,
    opacity: 0.34,
    resizeMode: "cover",
  },
  bottomCloud: {
    position: "absolute",
    bottom: 30,
    left: -120,
    width: "165%",
    height: 250,
    opacity: 0.28,
    resizeMode: "cover",
  },
  markerGlow: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 0,
    height: 22,
    borderRadius: 22,
    backgroundColor: "rgba(202,255,74,0.7)",
    shadowColor: "#caff4a",
    shadowOpacity: 0.9,
    shadowRadius: 18,
  },
  playerPawn: {
    width: 66,
    height: 66,
    resizeMode: "contain",
  },
  placeMarker: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.88)",
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 8,
  },
  placeMarkerOpened: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "#a9ec56",
  },
  placeText: {
    color: "#151a0f",
    fontSize: 18,
    fontWeight: "900",
  },
  mapButtons: {
    position: "absolute",
    right: 16,
    gap: 12,
  },
  roundButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(7, 20, 24, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  button: {
    position: "absolute",
    bottom: 104,
    left: 24,
    right: 24,
    height: 66,
    borderRadius: 29,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#299ef1",
    shadowColor: "#299ef1",
    shadowOpacity: 0.38,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
  },
  buttonText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  xpPopup: {
    position: "absolute",
    alignSelf: "center",
    bottom: 190,
    backgroundColor: "rgba(86, 122, 24, 0.96)",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  xpPopupText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
});
