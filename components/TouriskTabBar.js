import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_META = {
  Главная: { label: "Главная", icon: "home" },
  Карта: { label: "Карта", icon: "map" },
  Профиль: { label: "Профиль", icon: "person" },
  Лидеры: { label: "Лидеры", icon: "trophy" },
};

function TabItem({ route, isFocused, options, onPress, onLongPress }) {
  const progress = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const meta = TAB_META[route.name] || { label: route.name, icon: "ellipse" };

  useEffect(() => {
    Animated.timing(progress, {
      toValue: isFocused ? 1 : 0,
      duration: 560,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    }).start();
  }, [isFocused, progress]);

  const lift = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  const iconScale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const glowOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.28] });

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarButtonTestID}
      activeOpacity={0.82}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.activeGlow, { opacity: glowOpacity, transform: [{ scale: iconScale }] }]}
      />
      <Animated.View style={[styles.iconWrap, isFocused && styles.iconWrapActive, { transform: [{ translateY: lift }, { scale: iconScale }] }]}> 
        <Ionicons
          name={isFocused ? meta.icon : `${meta.icon}-outline`}
          size={25}
          color={isFocused ? "#b8f55b" : "rgba(223,236,231,0.56)"}
        />
      </Animated.View>
      <Text numberOfLines={1} style={[styles.label, isFocused && styles.labelActive]}>{meta.label}</Text>
    </TouchableOpacity>
  );
}

export default function TouriskTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: 1200,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    }).start();
  }, [reveal]);

  const translateY = reveal.interpolate({ inputRange: [0, 1], outputRange: [9, 0] });
  const bottom = Math.max(insets.bottom + 5, 14);

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          bottom,
          opacity: reveal,
          transform: [{ translateY }],
        },
      ]}
    >
      <View pointerEvents="none" style={styles.topGlow} />
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        const onLongPress = () => navigation.emit({ type: "tabLongPress", target: route.key });

        return (
          <TabItem
            key={route.key}
            route={route}
            isFocused={isFocused}
            options={options}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 14,
    right: 14,
    height: 82,
    borderRadius: 29,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(2, 23, 20, 0.965)",
    borderWidth: 1,
    borderColor: "rgba(178, 239, 92, 0.14)",
    shadowColor: "#000",
    shadowOpacity: 0.58,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 24,
    overflow: "hidden",
    zIndex: 100,
  },
  topGlow: {
    position: "absolute",
    left: 42,
    right: 42,
    top: 0,
    height: 1,
    backgroundColor: "rgba(188,245,91,0.36)",
    shadowColor: "#b8f55b",
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  item: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 5,
  },
  activeGlow: {
    position: "absolute",
    top: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#a9ec56",
    shadowColor: "#a9ec56",
    shadowOpacity: 0.68,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: "rgba(169,236,86,0.13)",
  },
  label: {
    marginTop: 0,
    color: "rgba(229,239,235,0.50)",
    fontSize: 11,
    fontWeight: "800",
  },
  labelActive: {
    color: "#b8f55b",
  },
});
