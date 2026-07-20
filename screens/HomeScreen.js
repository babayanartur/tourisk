import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import LivingWorld from "../components/LivingWorld";
import StaticPawn from "../components/StaticPawn";
import { DEFAULT_PAWNS, getGameContent, refreshGameContent } from "../services/gameService";
import { getStoredUser } from "../services/authService";
import { getLocalPawnFallback, getPawnSource } from "../services/assetResolver";

const homeBg = require("../assets/backgrounds/home-world-feedback.jpg");

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [pawns, setPawns] = useState(DEFAULT_PAWNS);
  const [selectedPawnId, setSelectedPawnId] = useState("pawn_green");
  const entrance = useRef(new Animated.Value(0)).current;
  const taglinePresence = useRef(new Animated.Value(0)).current;

  const load = async () => {
    const [content, user] = await Promise.all([getGameContent(), getStoredUser()]);
    const availablePawns = content.pawns?.length ? content.pawns : DEFAULT_PAWNS;
    setPawns(availablePawns);
    setSelectedPawnId(user?.selectedPawn || "pawn_green");
  };

  useEffect(() => {
    load().catch(() => {});
    refreshGameContent()
      .then((content) => setPawns(content.pawns?.length ? content.pawns : DEFAULT_PAWNS))
      .catch(() => {});

    entrance.setValue(0);
    Animated.timing(entrance, {
      toValue: 1,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const unsubscribe = navigation.addListener("focus", load);
    return () => unsubscribe?.();
  }, [entrance, navigation]);

  useEffect(() => {
    taglinePresence.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(450),
        Animated.timing(taglinePresence, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.delay(3600),
        Animated.timing(taglinePresence, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.delay(1000),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [taglinePresence]);

  const selectedPawn = useMemo(
    () => pawns.find((item) => item.id === selectedPawnId) || pawns[0] || DEFAULT_PAWNS[0],
    [pawns, selectedPawnId]
  );

  const compact = height < 760;
  const pawnSize = compact ? 250 : 292;
  const pawnTop = compact ? height * 0.40 : height * 0.43;
  const enterTranslate = entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const taglineTranslate = taglinePresence.interpolate({ inputRange: [0, 1], outputRange: [7, 0] });

  return (
    <View style={styles.root}>
      <LivingWorld
        source={homeBg}
        fogOpacity={0.30}
        windOpacity={0.23}
        scrim="rgba(0, 8, 11, 0.22)"
        bottomShade="rgba(0, 8, 10, 0.28)"
      />

      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 20,
            opacity: entrance,
            transform: [{ translateY: enterTranslate }],
          },
        ]}
      >
        <Text style={styles.logo}>TOURISK</Text>
        <View style={styles.brandRule}>
          <View style={styles.ruleLine} />
          <Text style={styles.ruleDiamond}>◇</Text>
          <View style={styles.ruleLine} />
        </View>

        <Text style={[styles.title, compact && styles.titleCompact]}>Мир ждёт тебя</Text>
        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: taglinePresence,
              transform: [{ translateY: taglineTranslate }],
            },
          ]}
        >
          Каждый шаг открывает твою историю.
        </Animated.Text>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.pawnStage,
          {
            top: pawnTop,
            width: pawnSize,
            height: pawnSize,
            opacity: entrance,
            transform: [{ translateY: enterTranslate }],
          },
        ]}
      >
        <View style={[styles.platformOuter, { width: pawnSize * 0.93, height: pawnSize * 0.31 }]} />
        <View style={[styles.platformInner, { width: pawnSize * 0.68, height: pawnSize * 0.21 }]} />
        <StaticPawn
          source={getPawnSource(selectedPawn)}
          fallbackSource={getLocalPawnFallback(selectedPawn)}
          rarity={selectedPawn.rarity}
          glowColor={selectedPawn.glowColor}
          size={pawnSize}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#020b0d",
  },
  header: {
    position: "absolute",
    left: 18,
    right: 18,
    top: 0,
    alignItems: "center",
    zIndex: 5,
  },
  logo: {
    color: "rgba(255,255,255,0.94)",
    fontSize: 25,
    fontWeight: "300",
    letterSpacing: 9,
    textShadowColor: "rgba(229,255,226,0.42)",
    textShadowRadius: 12,
  },
  brandRule: {
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ruleLine: {
    width: 54,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  ruleDiamond: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
  },
  title: {
    marginTop: 26,
    color: "#ffffff",
    fontSize: 41,
    lineHeight: 47,
    fontWeight: "900",
    letterSpacing: -1.35,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.78)",
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 5 },
  },
  titleCompact: {
    marginTop: 20,
    fontSize: 35,
    lineHeight: 41,
  },
  tagline: {
    marginTop: 9,
    color: "#f6cf70",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "800",
    letterSpacing: 0.1,
    textAlign: "center",
    textShadowColor: "rgba(255, 191, 57, 0.96)",
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  pawnStage: {
    position: "absolute",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  platformOuter: {
    position: "absolute",
    bottom: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(183,238,89,0.20)",
    backgroundColor: "rgba(2,18,16,0.25)",
    transform: [{ scaleY: 0.46 }],
  },
  platformInner: {
    position: "absolute",
    bottom: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(244,196,81,0.18)",
    backgroundColor: "rgba(244,196,81,0.035)",
    transform: [{ scaleY: 0.45 }],
  },
});
