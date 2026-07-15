import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

export default function ProgressBar({ progress = 0, height = 8, color = "#a9ec56" }) {
  const animated = useRef(new Animated.Value(0)).current;
  const safeProgress = Math.max(0, Math.min(Number(progress || 0), 100));

  useEffect(() => {
    Animated.timing(animated, {
      toValue: safeProgress,
      duration: 850,
      useNativeDriver: false,
    }).start();
  }, [animated, safeProgress]);

  const width = animated.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] });

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}> 
      <Animated.View style={[styles.fill, { width, height, borderRadius: height / 2, backgroundColor: color, shadowColor: color }]} />
      <View style={styles.highlight} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    shadowOpacity: 0.9,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
  },
  highlight: {
    position: "absolute",
    left: 4,
    right: 4,
    top: 1,
    height: 1,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
});
