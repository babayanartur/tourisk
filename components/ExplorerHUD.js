import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProgressBar from "./ProgressBar";

export default function ExplorerHUD({
  xp = 0,
  level = 1,
  progress = 0,
  currentLevelXp = 0,
  nextLevelXp = 100,
  zone = "Определяем местоположение",
  top = 50,
}) {
  return (
    <View pointerEvents="none" style={[styles.wrap, { top }]}> 
      <Text style={styles.logo}>TOURISK</Text>
      <View style={styles.brandRule}>
        <View style={styles.ruleLine} />
        <Text style={styles.ruleDiamond}>◇</Text>
        <View style={styles.ruleLine} />
      </View>

      <View style={styles.card}>
        <View style={styles.headRow}>
          <View>
            <Text style={styles.eyebrow}>УРОВЕНЬ {level}</Text>
            <Text style={styles.xp}>{formatNumber(xp)} XP</Text>
          </View>
          <Text style={styles.counter}>{currentLevelXp}/{nextLevelXp}</Text>
        </View>
        <ProgressBar progress={progress} height={8} color="#b8f55b" />
        <View style={styles.zoneRow}>
          <Ionicons name="location-outline" size={18} color="#b8f55b" />
          <Text numberOfLines={1} style={styles.zoneLabel}>Текущая зона: </Text>
          <Text numberOfLines={1} style={styles.zoneValue}>{zone}</Text>
        </View>
      </View>
    </View>
  );
}

function formatNumber(value) {
  return String(Number(value || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 14,
    right: 14,
    zIndex: 30,
    alignItems: "center",
  },
  logo: {
    color: "rgba(255,255,255,0.94)",
    fontSize: 23,
    fontWeight: "300",
    letterSpacing: 8,
    textShadowColor: "rgba(229,255,226,0.34)",
    textShadowRadius: 10,
  },
  brandRule: {
    marginTop: 8,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ruleLine: {
    width: 48,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  ruleDiamond: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
  },
  card: {
    width: "100%",
    paddingHorizontal: 17,
    paddingVertical: 15,
    borderRadius: 26,
    backgroundColor: "rgba(2, 24, 22, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(181,238,93,0.18)",
    shadowColor: "#000",
    shadowOpacity: 0.48,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 18,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  eyebrow: {
    color: "#b8f55b",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2.1,
  },
  xp: {
    marginTop: 5,
    color: "#fff",
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "900",
  },
  counter: {
    marginBottom: 2,
    color: "rgba(255,255,255,0.47)",
    fontSize: 12,
    fontWeight: "800",
  },
  zoneRow: {
    marginTop: 13,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  zoneLabel: {
    marginLeft: 7,
    color: "#b8f55b",
    fontSize: 11,
    fontWeight: "800",
  },
  zoneValue: {
    flex: 1,
    color: "rgba(255,255,255,0.77)",
    fontSize: 11,
    fontWeight: "700",
  },
});
