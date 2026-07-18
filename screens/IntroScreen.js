import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../services/storageKeys";
import LivingWorld from "../components/LivingWorld";

const introBg = require("../assets/backgrounds/home-world-feedback.jpg");

export default function IntroScreen({ onDone }) {
  const insets = useSafeAreaInsets();
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(26)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.spring(contentY, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]),
      Animated.timing(buttonOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();

  }, [buttonOpacity, contentOpacity, contentY]);

  const continueApp = async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.hasSeenIntro, "1");
    onDone();
  };

  return (
    <View style={styles.root}>
      <LivingWorld
        source={introBg}
        fogOpacity={0.42}
        windOpacity={0.28}
        scrim="rgba(0, 9, 12, 0.26)"
        bottomShade="rgba(0, 12, 12, 0.66)"
      />

      <Animated.View style={[styles.content, { paddingTop: insets.top + 42, opacity: contentOpacity, transform: [{ translateY: contentY }] }]}> 
        <Text style={styles.logo}>TOURISK</Text>
        <View style={styles.lineRow}>
          <View style={styles.line} />
          <Text style={styles.diamond}>◇</Text>
          <View style={styles.line} />
        </View>
        <View style={styles.badge}>
          <Ionicons name="compass-outline" size={16} color="#b9ed75" />
          <Text style={styles.badgeText}>ИГРА В РЕАЛЬНОМ МИРЕ</Text>
        </View>
        <Text style={styles.title}>Мир раскрывается там, где был ты.</Text>
        <Text style={styles.subtitle}>Исследуй города, открывай территории и собирай собственную карту путешествий.</Text>
      </Animated.View>

      <Animated.View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 18), opacity: buttonOpacity }]}> 
        <TouchableOpacity activeOpacity={0.9} style={styles.button} onPress={continueApp}>
          <View style={styles.buttonIcon}>
            <Ionicons name="footsteps" size={23} color="#07140d" />
          </View>
          <View style={styles.buttonCopy}>
            <Text style={styles.buttonText}>Сделать первый шаг</Text>
            <Text style={styles.buttonHint}>Начать свою историю</Text>
          </View>
          <Ionicons name="arrow-forward" size={21} color="#dfffae" />
        </TouchableOpacity>
        <Text style={styles.hint}>Карта запоминает только реальные открытия</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#03100e", overflow: "hidden" },
  background: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 9, 12, 0.24)" },
  bottomShade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "46%", backgroundColor: "rgba(0,12,12,0.62)" },
  content: { position: "absolute", left: 24, right: 24, top: 0, alignItems: "center" },
  logo: { color: "#fff", fontSize: 29, letterSpacing: 10, fontWeight: "300", textShadowColor: "rgba(255,255,255,0.5)", textShadowRadius: 14 },
  lineRow: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 14 },
  line: { width: 62, height: 1, backgroundColor: "rgba(255,255,255,0.30)" },
  diamond: { color: "rgba(255,255,255,0.76)", fontSize: 16 },
  badge: { marginTop: 26, height: 34, paddingHorizontal: 13, borderRadius: 17, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(5,26,22,0.72)", borderWidth: 1, borderColor: "rgba(169,236,86,0.18)" },
  badgeText: { color: "#b9ed75", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  title: { marginTop: 18, color: "#fff", fontSize: 39, lineHeight: 45, fontWeight: "900", textAlign: "center", letterSpacing: -1.1, textShadowColor: "rgba(0,0,0,0.72)", textShadowRadius: 14 },
  subtitle: { marginTop: 14, maxWidth: 340, color: "rgba(255,255,255,0.72)", fontSize: 15, lineHeight: 22, fontWeight: "700", textAlign: "center", textShadowColor: "rgba(0,0,0,0.74)", textShadowRadius: 9 },
  bottom: { position: "absolute", left: 18, right: 18, bottom: 12 },
  button: { minHeight: 76, paddingHorizontal: 12, borderRadius: 25, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(8,48,31,0.95)", borderWidth: 1, borderColor: "rgba(185,242,100,0.30)", shadowColor: "#000", shadowOpacity: 0.46, shadowRadius: 24, shadowOffset: { width: 0, height: 14 } },
  buttonIcon: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#a9ec56" },
  buttonCopy: { flex: 1, marginLeft: 12 },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "900" },
  buttonHint: { marginTop: 3, color: "rgba(255,255,255,0.54)", fontSize: 11, fontWeight: "700" },
  hint: { marginTop: 13, textAlign: "center", color: "rgba(255,255,255,0.42)", fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
});
