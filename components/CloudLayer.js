import React from "react";
import { Dimensions, Image, StyleSheet, View } from "react-native";
import { WorldAssets } from "../src/maps/services/WorldAssets";

const { width, height } = Dimensions.get("window");

export default function CloudLayer({ theme }) {
    const fogTextures = WorldAssets.fog[theme.timePhase] || WorldAssets.fog.day;

const fog1 = fogTextures[0];
const fog2 = fogTextures[1];
  return (
    <View pointerEvents="none" style={styles.container}>
<Image source={fog1} style={[styles.topFog, { tintColor: theme.worldLight }]} />
<Image source={fog2} style={[styles.bottomFog, { tintColor: theme.worldLight }]} />
<Image source={fog1} style={[styles.leftFog, { tintColor: theme.worldLight }]} />
<Image source={fog2} style={[styles.rightFog, { tintColor: theme.worldLight }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },

  topFog: {
    position: "absolute",
    top: -80,
    left: -40,
    width: width + 80,
    height: 220,
    opacity: 0.45,
  },

  bottomFog: {
    position: "absolute",
    bottom: -90,
    left: -40,
    width: width + 80,
    height: 230,
    opacity: 0.42,
    transform: [{ rotate: "180deg" }],
  },

  leftFog: {
    position: "absolute",
    top: 80,
    left: -120,
    width: 260,
    height: height - 160,
    opacity: 0.38,
    transform: [{ rotate: "90deg" }],
  },

  rightFog: {
    position: "absolute",
    top: 80,
    right: -120,
    width: 260,
    height: height - 160,
    opacity: 0.38,
    transform: [{ rotate: "-90deg" }],
  },
});