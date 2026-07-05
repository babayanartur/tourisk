import React from "react";
import { View, Text, StyleSheet } from "react-native";
import ProgressBar from "./ProgressBar";

export default function ExplorerHUD({
  xp,
  territories,
  level,
  remainingXp,
  title,
  progress,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>🧭 Исследование</Text>
        <Text style={styles.level}>Lv.{level}</Text>
      </View>

      <ProgressBar progress={progress} />

      <View style={styles.statsRow}>
        <Text style={styles.stat}>⭐ {xp} XP</Text>
        <Text style={styles.stat}>🌍 {territories} км²</Text>
        <Text style={styles.rank}>🏅 {title}</Text>
      </View>

      <Text style={styles.nextLevel}>
        {remainingXp} XP до следующего уровня
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 30,
    left: 10,
    right: 10,
    backgroundColor: "rgba(10,25,45,0.88)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  level: {
    color: "#b9d5ff",
    fontSize: 14,
    fontWeight: "800",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 7,
  },
  stat: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  rank: {
    color: "#34d399",
    fontSize: 13,
    fontWeight: "900",
  },
  nextLevel: {
    color: "#b8c7dc",
    fontSize: 11,
    marginTop: 5,
  },
});