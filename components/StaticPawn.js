import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { rarityColor } from "./AnimatedPawn";
import ResilientImage from "./ResilientImage";

export default function StaticPawn({ source, fallbackSource = null, size = 150, rarity = "common", glowColor, style }) {
  const color = glowColor || rarityColor(rarity);

  return (
    <View style={[styles.root, { width: size, height: size }, style]}>
      <View
        pointerEvents="none"
        style={[
          styles.baseGlow,
          {
            width: size * 0.58,
            height: size * 0.18,
            left: size * 0.21,
            bottom: size * 0.08,
            backgroundColor: color,
            shadowColor: color,
          },
        ]}
      />
      <ResilientImage
        source={source}
        fallbackSource={fallbackSource}
        fallbackElement={(
          <View style={[styles.placeholder, { width: size, height: size }]}> 
            <Text style={[styles.placeholderText, { color, fontSize: size * 0.56 }]}>♟</Text>
          </View>
        )}
        resizeMode="contain"
        style={{ width: size, height: size }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
  },
  baseGlow: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.28,
    shadowOpacity: 0.76,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    transform: [{ scaleX: 1.15 }],
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.72)",
    textShadowRadius: 8,
  },
});
