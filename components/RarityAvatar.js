import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { rarityColor } from "./AnimatedPawn";
import ResilientImage from "./ResilientImage";

export default function RarityAvatar({ source, fallbackSource = null, rarity = "common", glowColor, size = 58, selected = false }) {
  const color = glowColor || rarityColor(rarity);

  return (
    <View style={[styles.root, { width: size, height: size }]}> 
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: size * 0.68,
            height: size * 0.68,
            borderRadius: size,
            backgroundColor: color,
            shadowColor: color,
            opacity: selected ? 0.30 : 0.18,
          },
        ]}
      />
      <ResilientImage
        source={source}
        fallbackSource={fallbackSource}
        fallbackElement={<Text style={[styles.placeholder, { color, fontSize: size * 0.58 }]}>♟</Text>}
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
    overflow: "visible",
  },
  glow: {
    position: "absolute",
    shadowOpacity: 0.72,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  placeholder: {
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowRadius: 5,
  },
});
