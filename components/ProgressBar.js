import React from "react";
import { View, StyleSheet } from "react-native";

export default function ProgressBar({
  progress,
}) {
  return (
    <View style={styles.background}>
      <View
        style={[
          styles.fill,
          {
            width: `${Math.min(progress, 100)}%`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    width: "100%",
    height: 6,

    backgroundColor: "#29476d",

    borderRadius: 3,

    overflow: "hidden",

    marginVertical: 10,
  },

  fill: {
    height: "100%",

    backgroundColor: "#22c55e",

    borderRadius: 10,
  },
});