import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";

import AuthScreen from "./screens/AuthScreen";
import CityRewardScreen from "./screens/CityRewardScreen";
import HomeScreen from "./screens/HomeScreen";
import IntroScreen from "./screens/IntroScreen";
import LeaderboardScreen from "./screens/LeaderboardScreen";
import MapScreen from "./screens/MapScreen";
import ProfileScreen from "./screens/ProfileScreen";
import TouriskTabBar from "./components/TouriskTabBar";
import { getStoredUser } from "./services/authService";
import { STORAGE_KEYS } from "./services/storageKeys";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs({ onLogout }) {
  return (
    <Tab.Navigator
      tabBar={(props) => <TouriskTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Главная" component={HomeScreen} />
      <Tab.Screen name="Карта" component={MapScreen} />
      <Tab.Screen name="Профиль">
        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Лидеры" component={LeaderboardScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      const [storedUser, hasSeenIntro] = await Promise.all([
        getStoredUser(),
        AsyncStorage.getItem(STORAGE_KEYS.hasSeenIntro),
      ]);

      if (!mounted) return;
      setUser(storedUser);
      setIntroDone(Boolean(hasSeenIntro));
      setBooting(false);
    };

    boot();

    return () => {
      mounted = false;
    };
  }, []);

  if (booting) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#a8d85a" size="large" />
        <StatusBar style="light" />
      </View>
    );
  }

  if (!introDone) {
    return <IntroScreen onDone={() => setIntroDone(true)} />;
  }

  if (!user) {
    return <AuthScreen onAuth={setUser} />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs">
          {(props) => <MainTabs {...props} onLogout={() => setUser(null)} />}
        </Stack.Screen>
        <Stack.Screen name="CityReward" component={CityRewardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: "#04120d",
    alignItems: "center",
    justifyContent: "center",
  },
});
