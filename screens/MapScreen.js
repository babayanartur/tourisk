import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
} from "react-native";

import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { yerevanBoundary } from "../src/maps/data/cities/yerevanBoundary";
import MapView, { Marker, Circle, Polygon } from "react-native-maps";
import { yerevanDistricts } from "../src/maps/data/districts/yerevanDistricts";
import { MapProgress } from "../src/maps/services/MapProgress";
import { RouteTracker } from "../src/maps/services/RouteTracker";
import { ProgressEngine } from "../src/maps/services/ProgressEngine";
import { GeoUtils } from "../src/maps/utils/GeoUtils";
import { GridEngine } from "../src/maps/services/GridEngine";
import { TerritoryEngine } from "../src/maps/services/TerritoryEngine";
import { LevelEngine } from "../src/maps/services/LevelEngine";
import { FogEngine } from "../src/maps/services/FogEngine";
import { WorldTheme } from "../src/maps/services/WorldTheme";
import CityCard from "../components/CityCard";
import WorldRenderer from "../components/WorldRenderer";
import CloudLayer from "../components/CloudLayer";
import DebugPanel from "../components/DebugPanel";
import ExplorerHUD from "../components/ExplorerHUD";
import FogOverlay from "../components/FogOverlay";
import DiscoveryNotification from "../components/DiscoveryNotification";
import { legendaryPlaces } from "../data/legendaryPlaces";
import { DiscoveryEngine } from "../src/maps/services/DiscoveryEngine";
import {
  saveDemoUserProfile,
  saveDemoCheckin,
} from "../services/firebaseUserService";
const getCityImage = (city) => {
  switch (city) {
    case "Yerevan":
    case "Ереван":
      return "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=1200";

    default:
      return "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200";
  }
  };

export default function MapScreen() {
  const [location, setLocation] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [discoveredPlace, setDiscoveredPlace] = useState(null);
  const [openedLegendaryPlaces, setOpenedLegendaryPlaces] = useState([]);
  const [visitedCells, setVisitedCells] = useState([]);
  const [currentCellId, setCurrentCellId] = useState(null);
  const [worldNow, setWorldNow] = useState(new Date());
  const [selectedCity, setSelectedCity] = useState(null);
  const [showXp, setShowXp] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const xpAnim = useState(new Animated.Value(0))[0];
  const yerevanProgress = ProgressEngine.calculateCityProgress(yerevanDistricts);
const districtsWithProgress = yerevanDistricts.map((district) => ({
...district,
  
  progress: ProgressEngine.calculateDistrictProgress(
    visitedCells,
    district
  ),
}));

const territoryPolygons = [];

useEffect(() => {
  let locationSubscription;

  const startLocationWatcher = async () => {
    await loadCheckins();
    await getLocation();

    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 20,
        timeInterval: 5000,
      },
      async () => {
        await getLocation();
      }
    );
  };

  startLocationWatcher();

  return () => {
    if (locationSubscription) {
      locationSubscription.remove();
    }
  };
}, []);

useEffect(() => {
  const timer = setInterval(() => {
    setWorldNow(new Date());
  }, 30000);

  return () => clearInterval(timer);
}, []);

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Ошибка", "Разреши доступ к геолокации");
      return;
    }

    const currentLocation = await Location.getCurrentPositionAsync({});
    setLocation(currentLocation.coords);
    const district = yerevanDistricts.find((d) =>
  MapProgress.isPointInsideDistrict(
    currentLocation.coords.latitude,
    currentLocation.coords.longitude,
    d
  )
);

const districtId = district?.id || "unknown";

const cellId = GridEngine.getDistrictCellKey(
  districtId,
  GridEngine.getCellId(
    currentLocation.coords.latitude,
    currentLocation.coords.longitude
  )
);
setCurrentCellId(cellId);

setVisitedCells((prevCells) => {
  if (prevCells.includes(cellId)) {
    return prevCells;
  }

  const updatedCells = [...prevCells, cellId];

  AsyncStorage.setItem(
    "visitedCells",
    JSON.stringify(updatedCells)
  );

  return updatedCells;
});
};

  const loadCheckins = async () => {
    try {
      const saved = await AsyncStorage.getItem("checkins");
const savedCells = await AsyncStorage.getItem("visitedCells");
const savedLegendary = await AsyncStorage.getItem("openedLegendaryPlaces");

if (savedLegendary) {
  setOpenedLegendaryPlaces(JSON.parse(savedLegendary));
}

if (savedCells) {
  setVisitedCells(JSON.parse(savedCells));
}
      if (saved) {
        setCheckins(JSON.parse(saved));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const playXpAnimation = () => {
    setShowXp(true);
    xpAnim.setValue(0);

    Animated.timing(xpAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start(() => {
      setShowXp(false);
    });
  };
const normalizeCityName = (cityName) => {
  if (!cityName) return "Unknown";

  const name = cityName.trim().toLowerCase();

  if (
    name === "yerevan" ||
    name === "ереван" ||
    name === "erevan"
  ) {
    return "Yerevan";
  }

  return cityName.trim();
};
const getUniqueCitiesCount = (items) => {
  const uniqueCities = new Set(
    items.map((item) => normalizeCityName(item.title || item.city))
  );

  return uniqueCities.size;
};
const handleCheckIn = async () => {
    if (!location) return;
    if (isCheckingIn) return;
  setIsCheckingIn(true);
try {
  const district = yerevanDistricts.find((d) =>
  MapProgress.isPointInsideDistrict(
    location.latitude,
    location.longitude,
    d
  )
);

const districtId = district?.id || "unknown";

const cellId = GridEngine.getDistrictCellKey(
  districtId,
  GridEngine.getCellId(
    location.latitude,
    location.longitude
  )
);

const alreadyVisitedCell = visitedCells.includes(cellId);

if (alreadyVisitedCell) {
  Alert.alert(
    "Уже исследовано",
    "Эта территория уже открыта. XP повторно не начисляется."
  );
  return;
}
    const places = await Location.reverseGeocodeAsync({
      latitude: location.latitude,
      longitude: location.longitude,
    });

    const place = places[0];
  


   const rawCity = place?.city || "Неизвестный город";
const city = normalizeCityName(rawCity);
const country = place?.country || "Неизвестная страна";
const newCheckin = {
  id: Date.now().toString(),
  latitude: location.latitude,
  longitude: location.longitude,
  title: city,
  country: country,
  xp: 10,
  visitedAt: new Date().toLocaleDateString("ru-RU"),
};

const alreadyVisitedCity = checkins.some(
  (item) =>
    normalizeCityName(item.title) ===
    normalizeCityName(newCheckin.title)
);

if (alreadyVisitedCity) {
  Alert.alert(
    "Уже посещено",
    "Этот город уже есть в истории. Повторно не добавляем."
  );
  return;
}

const updatedCheckins = [...checkins, newCheckin];
const updatedCells = [...visitedCells, cellId];

setVisitedCells(updatedCells);

await AsyncStorage.setItem(
  "visitedCells",
  JSON.stringify(updatedCells)
);

setCheckins(updatedCheckins);

await AsyncStorage.setItem(
  "checkins",
  JSON.stringify(updatedCheckins)
);
    await saveDemoCheckin({
  city,
  country,
  latitude: location.latitude,
  longitude: location.longitude,
  xp: 10,
});
    await saveDemoUserProfile({
  xp: updatedCheckins.length * 10,
  coins: updatedCheckins.length * 5,
cities: getUniqueCitiesCount(updatedCheckins),
  countries: new Set(updatedCheckins.map(c => c.country)).size,
});

    playXpAnimation();

 Alert.alert(
  "Check-in выполнен",
  "Город: " + city + "\nСтрана: " + country + "\n\n+10 XP"
);

} finally {
  setIsCheckingIn(false);
}
};
const handleDiscoverLegendaryPlace = async (place) => {
  if (openedLegendaryPlaces.includes(place.id)) return;

  const updatedOpenedPlaces = [...openedLegendaryPlaces, place.id];

  setOpenedLegendaryPlaces(updatedOpenedPlaces);

  await AsyncStorage.setItem(
    "openedLegendaryPlaces",
    JSON.stringify(updatedOpenedPlaces)
  );

setDiscoveredPlace(place);

setTimeout(() => {
  setDiscoveredPlace(null);
}, 3000);
};
  if (!location) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Загружаем карту...</Text>
      </View>
    );
  }
const playerXp = LevelEngine.getXpFromTerritories(visitedCells.length);
const exploredKm2 = (visitedCells.length * 0.01).toFixed(2);
const playerLevel = LevelEngine.getLevel(playerXp);
const nearbyLegendaryPlaces = DiscoveryEngine.getNearbyLegendaryPlaces(
  location,
  legendaryPlaces,
  10000
).slice(0, 2);
console.log("Nearby legendary places:", nearbyLegendaryPlaces.length);
const remainingXp = LevelEngine.getRemainingXp(playerXp);
const explorerTitle = LevelEngine.getTitle(playerLevel);
const levelProgress = LevelEngine.getProgressPercent(playerXp);
const nearbyFogCells = FogEngine.getFogCellsAroundLocation(currentCellId, 3);
const hiddenFogCells = FogEngine.getHiddenCells(nearbyFogCells, visitedCells);
const worldTheme = WorldTheme.getTheme(worldNow);
const fogPolygons = FogEngine.buildFogPolygons(hiddenFogCells);
const hiddenLegendaryPlaces = nearbyLegendaryPlaces.filter(
  (place) => !openedLegendaryPlaces.includes(place.id)
);
const openedLegendaryPlacesObjects = nearbyLegendaryPlaces.filter((place) =>
  openedLegendaryPlaces.includes(place.id)
);
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        showsUserLocation={true}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
      >
        {checkins.some((item) => item.title === "Yerevan" || item.title === "Ереван") && (
  <>


{false &&
districtsWithProgress.map((district) => (
        <Polygon
        key={district.id}
        coordinates={district.boundary}
        strokeColor="#FFFFFF"
        fillColor={MapProgress.getDistrictColor(district.progress)}
        strokeWidth={2}
        tappable={true}
onPress={() => {
  Alert.alert(
    district.name,
    `Исследовано: ${district.progress}%`
  );
}}
      />
      
    ))}
  </>
)}
 
        {checkins.map((item) => (
          <Circle
            key={"circle-" + item.id}
            center={{
              latitude: item.latitude,
              longitude: item.longitude,
            }}
       radius={0}
fillColor="transparent"
strokeColor="transparent"
          />
        ))}

        {checkins.map((item) => (
          <Marker
            key={item.id}
            coordinate={{
              latitude: item.latitude,
              longitude: item.longitude,
            }}
            pinColor="green"
            title={"📍 " + item.title}
            description={"🌍 " + item.country + " • ✅ Посещено • ⭐ +10 XP"}
            onPress={() => setSelectedCity(item)}
          />
          
        ))}
        {hiddenLegendaryPlaces.map((place) => (
          
<Marker
    key={place.id}
    coordinate={{
        latitude: place.latitude,
        longitude: place.longitude,
        
    }}
      onPress={() => handleDiscoverLegendaryPlace(place)}

>
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: "rgba(255,215,0,0.92)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#fff",
      }}
    >
      <Text
        style={{
          fontWeight: "900",
          color: "#111",
        }}
      >
        ?
      </Text>
    </View>
  </Marker>
))}
{openedLegendaryPlacesObjects.map((place) => (
  <Marker
    key={"opened-" + place.id}
    coordinate={{
      latitude: place.latitude,
      longitude: place.longitude,
    }}
  >
    <View
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "rgba(255,255,255,0.95)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#34d399",
      }}
    >
      <Text style={{ fontSize: 17 }}>🏛</Text>
    </View>
  </Marker>
))}
{territoryPolygons.map((territory) => (
  <Polygon
key={`${territory.id}-${visitedCells.length}`}
    coordinates={territory.coordinates}
fillColor="rgba(34,197,94,0.14)"
strokeColor="rgba(34,197,94,0.45)"
    strokeWidth={2}
    zIndex={9999}
  />
  
))}
    <FogOverlay fogPolygons={fogPolygons} />  
      </MapView>
{/* <CloudLayer theme={worldTheme} /> */}
{/* <WorldRenderer theme={worldTheme} /> */}
{/* <CloudLayer theme={worldTheme} /> */}
<ExplorerHUD
  xp={playerXp}
  territories={visitedCells.length}
  level={playerLevel}
  remainingXp={remainingXp}
  title={explorerTitle}
    progress={levelProgress}
/>
<DiscoveryNotification place={discoveredPlace} />

<CityCard
  selectedCity={selectedCity}
  onClose={() => setSelectedCity(null)}
  progress={yerevanProgress}
/>

      {showXp && (
        <Animated.View
          style={[
            styles.xpPopup,
            {
              opacity: xpAnim,
              transform: [
                {
                  translateY: xpAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -80],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.xpPopupText}>⭐ +10 XP</Text>
        </Animated.View>
      )}
{/* 
<DebugPanel
  visitedCells={visitedCells}
  territoryPolygons={territoryPolygons}
  hiddenFogCells={hiddenFogCells}
/>
*/}
      <TouchableOpacity style={styles.button} onPress={handleCheckIn}>
<Text style={styles.buttonText}>
  🧭 Исследовать
</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loading: {
    flex: 1,
    backgroundColor: "#071d36",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  button: {
    position: "absolute",
    bottom: 30,
    left: 24,
    right: 24,
    backgroundColor: "#2196f3",
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  xpPopup: {
    position: "absolute",
    alignSelf: "center",
    bottom: 190,
    backgroundColor: "#7C4DFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  xpPopupText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
});
