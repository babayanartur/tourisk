import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";

const fogOne = require("../assets/fog/fog_day_01.png");
const fogTwo = require("../assets/fog/fog_day_02.png");
const fogSoft = require("../assets/fog/fog-soft.png");

export default function LivingWorld({
  source,
  scrim = "rgba(0, 10, 13, 0.34)",
  fogOpacity = 0.28,
  windOpacity = 0.28,
  bottomShade = "rgba(0, 9, 10, 0.36)",
  backgroundScale = [1.025, 1.075],
}) {
  const { width, height } = useWindowDimensions();
  const breathe = useRef(new Animated.Value(0)).current;
  const fogA = useRef(new Animated.Value(0)).current;
  const fogB = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const backgroundLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 18000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 18000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const fogLoopA = Animated.loop(
      Animated.sequence([
        Animated.timing(fogA, {
          toValue: 1,
          duration: 15000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(fogA, {
          toValue: 0,
          duration: 15000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const fogLoopB = Animated.loop(
      Animated.sequence([
        Animated.timing(fogB, {
          toValue: 1,
          duration: 21000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(fogB, {
          toValue: 0,
          duration: 21000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 4200, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 4200, useNativeDriver: true }),
      ])
    );

    backgroundLoop.start();
    fogLoopA.start();
    fogLoopB.start();
    glowLoop.start();

    return () => {
      backgroundLoop.stop();
      fogLoopA.stop();
      fogLoopB.stop();
      glowLoop.stop();
    };
  }, [breathe, fogA, fogB, glow]);

  const particles = useMemo(
    () => [
      { top: 0.18, delay: 0, duration: 9200, width: 64 },
      { top: 0.28, delay: 1800, duration: 10400, width: 86 },
      { top: 0.42, delay: 3400, duration: 11600, width: 52 },
      { top: 0.56, delay: 900, duration: 9800, width: 72 },
      { top: 0.69, delay: 4300, duration: 12400, width: 92 },
      { top: 0.79, delay: 2500, duration: 10800, width: 58 },
    ],
    []
  );

  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: backgroundScale });
  const translateX = breathe.interpolate({ inputRange: [0, 1], outputRange: [-6, 8] });
  const translateY = breathe.interpolate({ inputRange: [0, 1], outputRange: [4, -12] });
  const fogAX = fogA.interpolate({ inputRange: [0, 1], outputRange: [-90, 45] });
  const fogAY = fogA.interpolate({ inputRange: [0, 1], outputRange: [-12, 18] });
  const fogBX = fogB.interpolate({ inputRange: [0, 1], outputRange: [55, -80] });
  const fogBY = fogB.interpolate({ inputRange: [0, 1], outputRange: [16, -20] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.24] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.12] });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.Image
        source={source}
        resizeMode="cover"
        style={[
          styles.background,
          {
            width,
            height,
            transform: [{ scale }, { translateX }, { translateY }],
          },
        ]}
      />

      <View style={[styles.scrim, { backgroundColor: scrim }]} />

      <Animated.View
        style={[
          styles.worldGlow,
          {
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      <Animated.Image
        source={fogOne}
        resizeMode="cover"
        style={[
          styles.fog,
          styles.fogTop,
          {
            width: width * 1.65,
            opacity: fogOpacity,
            transform: [{ translateX: fogAX }, { translateY: fogAY }],
          },
        ]}
      />
      <Animated.Image
        source={fogTwo}
        resizeMode="cover"
        style={[
          styles.fog,
          styles.fogMiddle,
          {
            width: width * 1.7,
            opacity: fogOpacity * 0.8,
            transform: [{ translateX: fogBX }, { translateY: fogBY }, { rotate: "180deg" }],
          },
        ]}
      />
      <Animated.Image
        source={fogSoft}
        resizeMode="stretch"
        style={[
          styles.fogSoft,
          {
            width: width * 1.55,
            height: height * 0.46,
            opacity: fogOpacity * 0.52,
            transform: [{ translateX: fogAX }, { scale: glowScale }],
          },
        ]}
      />

      {particles.map((particle, index) => (
        <WindStreak
          key={`${particle.top}-${index}`}
          {...particle}
          screenWidth={width}
          opacity={windOpacity}
        />
      ))}

      <View style={styles.vignetteTop} />
      <View style={[styles.vignetteBottom, { backgroundColor: bottomShade }]} />
    </View>
  );
}

function WindStreak({ top, delay, duration, width, screenWidth, opacity }) {
  const travel = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(travel, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(travel, { toValue: 0, duration: 1, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [delay, duration, travel]);

  const translateX = travel.interpolate({ inputRange: [0, 1], outputRange: [-width - 90, screenWidth + 100] });
  const translateY = travel.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 8, -2] });
  const lineOpacity = travel.interpolate({ inputRange: [0, 0.16, 0.76, 1], outputRange: [0, opacity, opacity * 0.66, 0] });

  return (
    <Animated.View
      style={[
        styles.wind,
        {
          top: `${top * 100}%`,
          width,
          opacity: lineOpacity,
          transform: [{ translateX }, { translateY }, { rotate: "-8deg" }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  background: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  worldGlow: {
    position: "absolute",
    left: "24%",
    top: "29%",
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "rgba(206, 255, 112, 0.32)",
    shadowColor: "#d8ff82",
    shadowOpacity: 0.75,
    shadowRadius: 55,
    shadowOffset: { width: 0, height: 0 },
  },
  fog: {
    position: "absolute",
    left: -130,
    height: 270,
  },
  fogTop: {
    top: -75,
  },
  fogMiddle: {
    bottom: 70,
  },
  fogSoft: {
    position: "absolute",
    left: -90,
    top: "31%",
  },
  wind: {
    position: "absolute",
    left: 0,
    height: 1.5,
    borderRadius: 2,
    backgroundColor: "rgba(225, 255, 228, 0.78)",
    shadowColor: "#e7ffe7",
    shadowOpacity: 0.55,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  vignetteTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "28%",
    backgroundColor: "rgba(0, 4, 9, 0.19)",
  },
  vignetteBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "42%",
    backgroundColor: "rgba(0, 9, 10, 0.36)",
  },
});
