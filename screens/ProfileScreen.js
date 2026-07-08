import React, { useEffect, useState } from "react";
import {
  ImageBackground,
  StyleSheet,
  View,
  Text,
} from "react-native";

import { getPlayerStats } from "../services/playerStats";

const profileBg = require("../docs/mvp-yerevan/Profile_v1.1.png");

export default function ProfileScreen({ navigation }) {
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
    } catch (e) {
      console.log("Profile stats error:", e);
    }
  };

  useEffect(() => {
    loadStats();

    const unsubscribe = navigation.addListener("focus", loadStats);

    return unsubscribe;
  }, [navigation]);

  return (
    <ImageBackground source={profileBg} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay}>

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

liveStats: {
  position: "absolute",
  left: 44,
  right: 44,
  top: 137,
  height: 48,
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
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 5,
  },
});