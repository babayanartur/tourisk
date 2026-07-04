import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function DebugPanel({
  visitedCells,
  territoryPolygons,
  hiddenFogCells,
}) {
  if (!__DEV__) return null;

  return (
    <View style={styles.debugPanel}>
      <Text style={styles.debugText}>
        Cells: {visitedCells.length} • Territories: {territoryPolygons.length} • Fog: {hiddenFogCells.length}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  debugPanel: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: "rgba(7,29,54,0.85)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: "center",
  },

  debugText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});