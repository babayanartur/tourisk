import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_META = {
  "Главная": { label: "Главная", icon: "home" },
  "Карта": { label: "Карта", icon: "map" },
  "Профиль": { label: "Профиль", icon: "person" },
  "Лидеры": { label: "Лидеры", icon: "trophy" },
};

function TabItem({ route, isFocused, options, onPress, onLongPress }) {
  const scale = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const meta = TAB_META[route.name] || { label: route.name, icon: "ellipse" };

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 90,
    }).start();
  }, [isFocused, scale]);

  const lift = scale.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });
  const iconScale = scale.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarButtonTestID}
      activeOpacity={0.86}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}
    >
      <Animated.View style={[styles.iconWrap, isFocused && styles.iconWrapActive, { transform: [{ translateY: lift }, { scale: iconScale }] }]}>
        <Ionicons name={isFocused ? meta.icon : `${meta.icon}-outline`} size={24} color={isFocused ? "#a9ec56" : "rgba(255,255,255,0.54)"} />
      </Animated.View>
      <Text numberOfLines={1} style={[styles.label, isFocused && styles.labelActive]}>{meta.label}</Text>
    </TouchableOpacity>
  );
}

export default function TouriskTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10), height: 82 + Math.max(insets.bottom - 8, 0) }]}>
      <View pointerEvents="none" style={styles.topGlow} />
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        const onLongPress = () => navigation.emit({ type: "tabLongPress", target: route.key });

        return <TabItem key={route.key} route={route} isFocused={isFocused} options={options} onPress={onPress} onLongPress={onLongPress} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: "rgba(5, 27, 20, 0.98)",
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(169, 236, 86, 0.12)",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.46,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -10 },
    elevation: 24,
    overflow: "hidden",
  },
  topGlow: {
    position: "absolute",
    left: 28,
    right: 28,
    top: 0,
    height: 1,
    backgroundColor: "rgba(169,236,86,0.28)",
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: "rgba(169,236,86,0.12)",
    shadowColor: "#a9ec56",
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  label: {
    marginTop: 1,
    color: "rgba(255,255,255,0.48)",
    fontSize: 12,
    fontWeight: "900",
  },
  labelActive: {
    color: "#a9ec56",
  },
});
