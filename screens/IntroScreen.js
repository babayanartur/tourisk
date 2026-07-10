import React, { useEffect, useRef } from "react";
import {
  Animated,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../services/storageKeys";

const heroBg = require("../brand/hero/hero-v1.png");

export default function IntroScreen({ onDone }) {
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(24)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(titleY, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();

    return () => pulse.stop();
  }, [buttonOpacity, glow, titleOpacity, titleY]);

  const continueApp = async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.hasSeenIntro, "1");
    onDone();
  };

  return (
    <ImageBackground source={heroBg} resizeMode="cover" style={styles.bg}>
      <View style={styles.scrim} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleY }],
          },
        ]}
      >
        <Text style={styles.logo}>TOURISK</Text>
        <Text style={styles.symbol}>◇</Text>
        <Text style={styles.title}>Мир ждёт тебя.</Text>
        <Text style={styles.subtitle}>
          Иди, открывай, запоминай. Карта будет раскрывать мир только там, где был ты.
        </Text>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulse,
          {
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.48] }),
            transform: [
              {
                scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1.16] }),
              },
            ],
          },
        ]}
      />

      <Animated.View style={[styles.bottom, { opacity: buttonOpacity }]}>
        <TouchableOpacity activeOpacity={0.9} style={styles.button} onPress={continueApp}>
          <Text style={styles.buttonText}>🌱 Первый шаг</Text>
          <Text style={styles.buttonHint}>Начни свою историю</Text>
        </TouchableOpacity>
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "#04120d",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 10, 14, 0.42)",
  },
  content: {
    flex: 1,
    paddingTop: 120,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  logo: {
    color: "#f5f7f2",
    fontSize: 32,
    letterSpacing: 10,
    fontWeight: "300",
    textShadowColor: "rgba(255,255,255,0.65)",
    textShadowRadius: 14,
  },
  symbol: {
    marginTop: 14,
    color: "rgba(255,255,255,0.8)",
    fontSize: 20,
  },
  title: {
    marginTop: 80,
    color: "#fff",
    fontSize: 48,
    lineHeight: 54,
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowRadius: 18,
  },
  subtitle: {
    marginTop: 20,
    color: "rgba(255,255,255,0.86)",
    fontSize: 18,
    lineHeight: 27,
    textAlign: "center",
    fontWeight: "600",
  },
  pulse: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    bottom: 238,
    alignSelf: "center",
    backgroundColor: "#9fd94e",
  },
  bottom: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 58,
  },
  button: {
    height: 86,
    borderRadius: 34,
    backgroundColor: "rgba(88, 132, 29, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(202,255,108,0.55)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#9fd94e",
    shadowOpacity: 0.42,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
  },
  buttonHint: {
    marginTop: 4,
    color: "rgba(255,255,255,0.78)",
    fontSize: 15,
    fontWeight: "700",
  },
});
