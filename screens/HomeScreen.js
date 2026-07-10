import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getPlayerStats } from "../services/playerStats";

const homeBg = require("../docs/mvp-yerevan/Home_v1.1.png");

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState({ xp: 0, territories: 0, achievements: 0, exploredKm2: 0, cities: 0, countries: 0 });
  const pulse = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  const load = async () => setStats(await getPlayerStats());

  useEffect(() => {
    load();
    const unsubscribe = navigation.addListener("focus", load);

    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 3600, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 3600, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    ).start();

    return unsubscribe;
  }, [navigation, float, pulse]);

  const pawnLift = float.interpolate({ inputRange: [0, 1], outputRange: [0, -9] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.34, 0.65] });

  return (
    <ImageBackground source={homeBg} style={styles.bg} resizeMode="cover">
      <View style={styles.topShade} />
      <View style={styles.bottomShade} />

      <View style={[styles.logoBlock, { top: insets.top + 68 }]} pointerEvents="none">
        <Text style={styles.logo}>TOURISK</Text>
        <View style={styles.logoLineRow}>
          <View style={styles.logoLine} />
          <Text style={styles.logoDiamond}>◇</Text>
          <View style={styles.logoLine} />
        </View>
      </View>

      <View style={[styles.titleBlock, { top: insets.top + 208 }]} pointerEvents="none">
        <Text style={styles.title}>Мир ждёт тебя.</Text>
        <Text style={styles.subtitle}>Каждый шаг — это история.</Text>
        <Text style={styles.subtitle}>Каждое открытие — это ты.</Text>
      </View>

      <Animated.View style={[styles.pawnGlow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
      <Animated.View style={[styles.pawnHalo, { transform: [{ translateY: pawnLift }] }]} />

      <TouchableOpacity activeOpacity={0.92} style={styles.firstStepButton} onPress={() => navigation.navigate("Карта")}>
        <View style={styles.buttonGlow} />
        <Text style={styles.firstStepTitle}>🌱 Первый шаг</Text>
        <Text style={styles.firstStepSubtitle}>— Начни свою историю —</Text>
      </TouchableOpacity>

      <View style={styles.statsPanel}>
        <HomeStat icon="star" value={stats.xp || 0} label="XP" />
        <HomeStat icon="leaf" value={stats.territories || 0} label="территорий" />
        <HomeStat icon="trophy" value={stats.achievements || 0} label="ачивок" />
      </View>
    </ImageBackground>
  );
}

function HomeStat({ icon, value, label }) {
  const source = icon === "star" ? "⭐" : icon === "leaf" ? "🌿" : "🏆";
  return (
    <View style={styles.statItem}>
      <Text style={styles.statIcon}>{source}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "#04120d",
  },
  topShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  bottomShade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 290,
    backgroundColor: "rgba(1, 12, 13, 0.48)",
  },
  logoBlock: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  logo: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 32,
    letterSpacing: 10,
    fontWeight: "300",
    textShadowColor: "rgba(255,255,255,0.72)",
    textShadowRadius: 14,
  },
  logoLineRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  logoLine: {
    width: 88,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.32)",
  },
  logoDiamond: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 17,
  },
  titleBlock: {
    position: "absolute",
    left: 20,
    right: 20,
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: 47,
    lineHeight: 54,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -1,
    textShadowColor: "rgba(0,0,0,0.58)",
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 4 },
  },
  subtitle: {
    marginTop: 12,
    color: "rgba(255,255,255,0.84)",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "500",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowRadius: 8,
  },
  pawnGlow: {
    position: "absolute",
    alignSelf: "center",
    bottom: 236,
    width: 170,
    height: 56,
    borderRadius: 85,
    backgroundColor: "rgba(185,255,74,0.34)",
    shadowColor: "#b8ff4a",
    shadowOpacity: 0.9,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 0 },
  },
  pawnHalo: {
    position: "absolute",
    alignSelf: "center",
    bottom: 248,
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: "rgba(227,255,132,0.34)",
    backgroundColor: "rgba(227,255,132,0.05)",
  },
  firstStepButton: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: 186,
    height: 98,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(32, 75, 18, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(205,255,94,0.48)",
    shadowColor: "#b8ff4a",
    shadowOpacity: 0.38,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  buttonGlow: {
    position: "absolute",
    left: 28,
    right: 28,
    top: 0,
    height: 2,
    backgroundColor: "rgba(208,255,99,0.85)",
    shadowColor: "#d0ff63",
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  firstStepTitle: {
    color: "#fff",
    fontSize: 31,
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowRadius: 8,
  },
  firstStepSubtitle: {
    marginTop: 4,
    color: "rgba(255,255,255,0.78)",
    fontSize: 17,
    fontWeight: "700",
  },
  statsPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 82,
    height: 126,
    flexDirection: "row",
    backgroundColor: "rgba(2, 15, 18, 0.82)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.07)",
  },
  statIcon: {
    fontSize: 39,
    marginBottom: 4,
  },
  statValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
  },
  statLabel: {
    marginTop: 5,
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    fontWeight: "800",
  },
});
