import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function DiscoveryNotification({ place }) {
  if (!place) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        ✨ Новое открытие
      </Text>

      <Text style={styles.name}>
        🏛 {place.name}
      </Text>

      <Text style={styles.xp}>
        +{place.xp} XP
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 90,
    left: 20,
    right: 20,

    backgroundColor: "rgba(255,255,255,0.96)",

    borderRadius: 20,

    padding: 18,

    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 12,
  },

  title: {
    fontSize: 14,
    color: "#D97706",
    fontWeight: "700",
  },

  name: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "800",
    color: "#222",
  },

  xp: {
    marginTop: 6,
    fontSize: 17,
    color: "#16A34A",
    fontWeight: "700",
  },
});