import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "./screens/HomeScreen";
import MapScreen from "./screens/MapScreen";
import ProfileScreen from "./screens/ProfileScreen";
import LeaderboardScreen from "./screens/LeaderboardScreen";
import CityRewardScreen from "./screens/CityRewardScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Главная" component={HomeScreen} />
      <Tab.Screen name="Карта" component={MapScreen} />
      <Tab.Screen name="Профиль" component={ProfileScreen} />
      <Tab.Screen name="Лидеры" component={LeaderboardScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="CityReward" component={CityRewardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}