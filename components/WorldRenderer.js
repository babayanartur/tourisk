import React from "react";
import { View, StyleSheet } from "react-native";

export default function WorldRenderer({ theme }) {
  return (
    <View pointerEvents="none" style={styles.container}>
      <View
        style={[
          styles.worldTint,
          {
            backgroundColor: theme.worldLight,
          },
        ]}
      />

      <View style={styles.vignette} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },

  worldTint: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },

  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4,10,20,0.18)",
  },
});