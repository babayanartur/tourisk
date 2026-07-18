import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import TouriskTabBar from "./components/TouriskTabBar";
import AuthScreen from "./screens/AuthScreen";
import HomeScreen from "./screens/HomeScreen";
import IntroScreen from "./screens/IntroScreen";
import LeaderboardScreen from "./screens/LeaderboardScreen";
import MapScreen from "./screens/MapScreen";
import ProfileScreen from "./screens/ProfileScreen";
import { getStoredUser, logout, syncCurrentUser } from "./services/authService";
import { flushPendingDiscoveries } from "./services/gameService";
import { STORAGE_KEYS } from "./services/storageKeys";

const ROUTES = [
  { key: "home", name: "Главная" },
  { key: "map", name: "Карта" },
  { key: "profile", name: "Профиль" },
  { key: "leaders", name: "Лидеры" },
];

const SCREEN_BY_ROUTE = {
  Главная: HomeScreen,
  Карта: MapScreen,
  Профиль: ProfileScreen,
  Лидеры: LeaderboardScreen,
};

function AppTabs({ onLogout }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeRoute = ROUTES[activeIndex];
  const ActiveScreen = SCREEN_BY_ROUTE[activeRoute.name];

  const navigate = useCallback((routeName) => {
    const nextIndex = ROUTES.findIndex((route) => route.name === routeName);
    if (nextIndex >= 0) setActiveIndex(nextIndex);
  }, []);

  const navigation = useMemo(
    () => ({
      navigate,
      emit: () => ({ defaultPrevented: false }),
      addListener: () => () => {},
      isFocused: () => true,
    }),
    [navigate]
  );

  const state = useMemo(
    () => ({ index: activeIndex, routes: ROUTES }),
    [activeIndex]
  );

  const descriptors = useMemo(
    () => Object.fromEntries(ROUTES.map((route) => [route.key, { options: {} }])),
    []
  );

  return (
    <View style={styles.appRoot}>
      <View key={activeRoute.key} style={styles.screen}>
        <ActiveScreen navigation={navigation} onLogout={onLogout} />
      </View>
      <TouriskTabBar state={state} descriptors={descriptors} navigation={navigation} />
    </View>
  );
}

function TouriskApp() {
  const [loading, setLoading] = useState(true);
  const [hasSeenIntro, setHasSeenIntro] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.hasSeenIntro),
      getStoredUser(),
    ])
      .then(([introFlag, storedUser]) => {
        if (!mounted) return;
        setHasSeenIntro(introFlag === "1");
        setUser(storedUser);
        if (storedUser) {
          syncCurrentUser()
            .then((freshUser) => {
              if (mounted && freshUser) setUser(freshUser);
              return flushPendingDiscoveries();
            })
            .catch(() => {});
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setUser(null);
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#a9ec56" />
      </View>
    );
  }

  if (!hasSeenIntro) {
    return <IntroScreen onDone={() => setHasSeenIntro(true)} />;
  }

  if (!user) {
    return <AuthScreen onAuth={setUser} />;
  }

  return <AppTabs onLogout={handleLogout} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <TouriskApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: "#020b0c",
  },
  screen: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020b0c",
  },
});
