import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from "react-native";

import { getPlayerStats } from "../services/playerStats";

const homeBg = require("../docs/mvp-yerevan/Home_v1.1.png");

export default function HomeScreen({ navigation }) {
  const [stats, setStats] = useState({
    xp: 0,
    territories: 0,
    achievements: 0,
  });

  const loadStats = async () => {
    try {
      const playerStats = await getPlayerStats();

      setStats({
        xp: playerStats?.xp || 0,
        territories: playerStats?.territories || 0,
        achievements: playerStats?.achievements || 0,
      });
    } catch (error) {
      console.log("Home stats load error:", error);
    }
  };

  useEffect(() => {
    loadStats();

    const unsubscribe = navigation.addListener("focus", loadStats);

    return unsubscribe;
  }, [navigation]);

  return (
    <ImageBackground source={homeBg} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.hotButton}
          activeOpacity={0.9}
          onPress={() => navigation.navigate("Карта")}
        />

        <View style={styles.liveStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.xp}</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.territories}</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.achievements}</Text>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
  },
  hotButton: {
    position: "absolute",
    left: 55,
    right: 55,
    bottom: 205,
    height: 82,
    borderRadius: 34,
  },
  liveStats: {
    position: "absolute",
    left: 64,
    right: 64,
    bottom: 108,
    height: 62,
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
});