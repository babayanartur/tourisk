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
    <View style={styles.header}>
  <Text style={styles.title}>🧭 Explorer</Text>

  <Text style={styles.level}>
    Lv.{level}
  </Text>
</View>

<ProgressBar progress={progress} />

<View style={styles.row}>
  <Text style={styles.item}>
    ⭐ {xp} XP
  </Text>

  <Text style={styles.item}>
    🟩 {territories}
  </Text>
</View>

<Text style={styles.rank}>
  🏅 {title}
</Text>

<Text style={styles.nextLevel}>
  {remainingXp} XP до следующего уровня
</Text>
    </View>
  );
}

const styles = StyleSheet.create({
container: {
  position: "absolute",
  top: 95,
  left: 16,
  right: 16,
  backgroundColor: "rgba(11, 35, 68, 0.94)",
  borderRadius: 18,
  paddingVertical: 10,
  paddingHorizontal: 14,
},

  title: {
    color: "white",
    fontSize: 20,
    fontWeight: "800",

    marginBottom: 8,
  },
  rank: {
  color: "#34d399",
  fontSize: 16,
  fontWeight: "800",
  marginBottom: 6,
},

  item: {
    color: "white",
fontSize: 13,
marginTop: 1,
  },
});