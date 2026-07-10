import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProgressBar from "./ProgressBar";

export default function ExplorerHUD({ xp, territories, level, remainingXp, title, progress }) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.titleRow}>
          <View style={styles.compassBadge}><Ionicons name="compass" size={18} color="#fff" /></View>
          <Text style={styles.title}>Исследование</Text>
        </View>
        <Text style={styles.level}>Lv.{level}</Text>
      </View>

      <ProgressBar progress={progress} />

      <View style={styles.statsRow}>
        <Text style={styles.stat}>⭐ {xp} XP</Text>
        <Text style={styles.stat}>🌍 {territories} км²</Text>
        <Text style={styles.rank}>🏅 {title}</Text>
      </View>

      <Text style={styles.nextLevel}>{remainingXp} XP до следующего уровня</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 56,
    left: 12,
    right: 12,
    backgroundColor: "rgba(11, 31, 51, 0.93)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    shadowColor: "#000",
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  compassBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  level: {
    color: "#c8dcff",
    fontSize: 18,
    fontWeight: "900",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 13,
  },
  stat: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  rank: {
    color: "#34d399",
    fontSize: 15,
    fontWeight: "900",
  },
  nextLevel: {
    color: "#b8c7dc",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 7,
  },
});
