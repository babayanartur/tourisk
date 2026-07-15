import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

export default function GoldenTrailText({ text, style }) {
  const letters = useMemo(() => Array.from(text || ""), [text]);
  const animations = useRef([]);
  const trail = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);

  if (animations.current.length !== letters.length) {
    animations.current = letters.map(() => new Animated.Value(0));
  }

  useEffect(() => {
    animations.current.forEach((value) => value.setValue(0));
    trail.setValue(0);

    const reveal = Animated.stagger(
      42,
      animations.current.map((value) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    );

    const trailAnimation = Animated.timing(trail, {
      toValue: 1,
      duration: Math.max(950, letters.length * 48),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    Animated.parallel([reveal, trailAnimation]).start();
  }, [letters.length, text, trail]);

  const trailX = trail.interpolate({ inputRange: [0, 1], outputRange: [-30, Math.max(width - 16, 0)] });
  const trailOpacity = trail.interpolate({ inputRange: [0, 0.08, 0.8, 1], outputRange: [0, 0.9, 0.62, 0] });

  return (
    <View style={styles.wrap} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View style={styles.letters}>
        {letters.map((letter, index) => {
          const value = animations.current[index];
          const translateY = value.interpolate({ inputRange: [0, 1], outputRange: [7, 0] });
          return (
            <Animated.Text
              key={`${letter}-${index}`}
              style={[
                styles.letter,
                style,
                {
                  opacity: value,
                  transform: [{ translateY }],
                },
              ]}
            >
              {letter === " " ? "\u00A0" : letter}
            </Animated.Text>
          );
        })}
      </View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.trail,
          {
            opacity: trailOpacity,
            transform: [{ translateX: trailX }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
  },
  letters: {
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "center",
  },
  letter: {
    color: "#f7d883",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "800",
    textShadowColor: "rgba(255, 202, 74, 0.95)",
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
  trail: {
    position: "absolute",
    bottom: -2,
    left: 0,
    width: 38,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#ffd86e",
    shadowColor: "#ffd86e",
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
});
