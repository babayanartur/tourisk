import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

const RARITY_COLORS = {
  common: "#a9ec56",
  uncommon: "#d88c48",
  rare: "#68d6ff",
  epic: "#c66dff",
  legendary: "#f4c451",
  mythic: "#78ffd4",
  shadow: "#8d72d8",
};

export default function AnimatedPawn({ source, size = 150, rarity = "common", style }) {
  const breath = useRef(new Animated.Value(0)).current;
  const color = RARITY_COLORS[rarity] || RARITY_COLORS.common;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 2300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 2300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1.045] });
  const translateY = breath.interpolate({ inputRange: [0, 1], outputRange: [2, -4] });
  const glowOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.58] });
  const auraScale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1.13] });

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: color,
            opacity: glowOpacity,
            transform: [{ scale: auraScale }],
          },
        ]}
      />
      <Animated.Image
        source={source}
        resizeMode="contain"
        style={{
          width: size,
          height: size,
          transform: [{ translateY }, { scale }],
        }}
      />
    </View>
  );
}

export function rarityColor(rarity) {
  return RARITY_COLORS[rarity] || RARITY_COLORS.common;
}

const styles = StyleSheet.create({
  glow: {
    position: "absolute",
    left: "18%",
    right: "18%",
    bottom: "11%",
    height: "30%",
    borderRadius: 999,
    shadowColor: "#d8ff7a",
    shadowOpacity: 0.78,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
});
