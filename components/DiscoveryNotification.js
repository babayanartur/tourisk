import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function DiscoveryNotification({ place, top = 190 }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!place) return;
    progress.setValue(0);
    Animated.spring(progress, {
      toValue: 1,
      friction: 8,
      tension: 70,
      useNativeDriver: true,
    }).start();
  }, [place, progress]);

  if (!place) return null;

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] });

  return (
    <Animated.View style={[styles.container, { top, opacity: progress, transform: [{ translateY }] }]}> 
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>✦</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>НОВОЕ ОТКРЫТИЕ</Text>
        <Text numberOfLines={1} style={styles.name}>{place.name}</Text>
        <Text style={styles.meta}>{place.rarity === "hidden" ? "Скрытое место" : "Легендарное место"}</Text>
      </View>
      <View style={styles.reward}>
        <Ionicons name="sparkles" size={14} color="#f5d47a" />
        <Text style={styles.xp}>+{place.xp || 50}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 14,
    right: 14,
    minHeight: 78,
    paddingHorizontal: 11,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(4, 27, 24, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(244,196,81,0.38)",
    shadowColor: "#000",
    shadowOpacity: 0.46,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    zIndex: 25,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,196,81,0.12)",
    borderWidth: 1,
    borderColor: "rgba(244,196,81,0.24)",
  },
  icon: {
    color: "#f4c451",
    fontSize: 27,
    textShadowColor: "#f4c451",
    textShadowRadius: 12,
  },
  copy: {
    flex: 1,
    marginLeft: 11,
  },
  eyebrow: {
    color: "#f4c451",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  name: {
    marginTop: 3,
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  meta: {
    marginTop: 2,
    color: "rgba(255,255,255,0.43)",
    fontSize: 9,
    fontWeight: "700",
  },
  reward: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 47,
  },
  xp: {
    marginTop: 3,
    color: "#f5d47a",
    fontSize: 13,
    fontWeight: "900",
  },
});
