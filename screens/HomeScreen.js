import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import StaticPawn from "../components/StaticPawn";
import DailyJourneyCard from "../components/DailyJourneyCard";
import GoldenTrailText from "../components/GoldenTrailText";
import LivingWorld from "../components/LivingWorld";
import ProgressBar from "../components/ProgressBar";
import { DEFAULT_PAWNS, getGameContent } from "../services/gameService";
import { getStoredUser } from "../services/authService";
import { getEveningJourney, markEveningJourneyShown } from "../services/dailyJourney";
import { getPlayerStats } from "../services/playerStats";
import { getLocalPawnFallback, getPawnSource } from "../services/assetResolver";
import { LevelEngine } from "../src/maps/services/LevelEngine";

const homeBg = require("../assets/backgrounds/home-world-clean.jpg");

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [stats, setStats] = useState({
    xp: 0,
    territories: 0,
    achievements: 0,
    exploredKm2: 0,
    distanceKm: 0,
    level: 1,
  });
  const [pawns, setPawns] = useState(DEFAULT_PAWNS);
  const [selectedPawnId, setSelectedPawnId] = useState("pawn_green");
  const [dailyJourney, setDailyJourney] = useState(null);
  const [eveningHour, setEveningHour] = useState(18);
  const enter = useRef(new Animated.Value(0)).current;
  const messagePresence = useRef(new Animated.Value(0)).current;

  const load = async () => {
    const [playerStats, content, user] = await Promise.all([
      getPlayerStats(),
      getGameContent(),
      getStoredUser(),
    ]);
    setStats(playerStats);
    setPawns(content.pawns?.length ? content.pawns : DEFAULT_PAWNS);
    setSelectedPawnId(user?.selectedPawn || playerStats.selectedPawn || "pawn_green");
    const configuredEveningHour = Number(content.appConfig?.dailyJourneyHour || 18);
    setEveningHour(configuredEveningHour);
    setDailyJourney(await getEveningJourney({ eveningHour: configuredEveningHour }));
  };

  useEffect(() => {
    load();
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const unsubscribe = navigation.addListener("focus", load);
    const eveningTimer = setInterval(() => {
      getEveningJourney({ eveningHour }).then(setDailyJourney).catch(() => {});
    }, 60000);
    return () => {
      unsubscribe?.();
      clearInterval(eveningTimer);
    };
  }, [enter, eveningHour, navigation]);

  useEffect(() => {
    messagePresence.setValue(0);
    const messageLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(messagePresence, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.delay(4800),
        Animated.timing(messagePresence, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.delay(1500),
      ])
    );
    messageLoop.start();
    return () => messageLoop.stop();
  }, [messagePresence]);

  const selectedPawn = useMemo(
    () => pawns.find((item) => item.id === selectedPawnId) || pawns[0] || DEFAULT_PAWNS[0],
    [pawns, selectedPawnId]
  );

  const level = LevelEngine.getLevel(stats.xp || 0);
  const levelProgress = LevelEngine.getProgressPercent(stats.xp || 0);
  const nextLevelXp = LevelEngine.getXpForNextLevel();
  const currentLevelXp = LevelEngine.getCurrentLevelXp(stats.xp || 0);
  const contentTranslate = enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const compact = height < 760;
  const pawnSize = compact ? 205 : 244;
  const pawnTop = compact ? insets.top + 208 : Math.max(insets.top + 226, height * 0.31);

  return (
    <View style={styles.root}>
      <LivingWorld source={homeBg} fogOpacity={0.30} windOpacity={0.23} scrim="rgba(0, 8, 11, 0.24)" />

      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 13,
            opacity: enter,
            transform: [{ translateY: contentTranslate }],
          },
        ]}
      >
        <Text style={styles.logo}>TOURISK</Text>
        <View style={styles.brandRule}>
          <View style={styles.ruleLine} />
          <Text style={styles.ruleDiamond}>◇</Text>
          <View style={styles.ruleLine} />
        </View>
        <Animated.View style={[styles.atmosphericMessage, { opacity: messagePresence }]}>
          <Text style={[styles.title, compact && styles.titleCompact]}>Мир ждёт тебя.</Text>
          <GoldenTrailText text="Каждый шаг оставляет золотой след" style={styles.goldText} />
        </Animated.View>
      </Animated.View>

      <View pointerEvents="none" style={[styles.pawnStage, { top: pawnTop, width: pawnSize, height: pawnSize }]}> 
        <View style={[styles.platformOuter, { width: pawnSize * 0.95, height: pawnSize * 0.34, bottom: pawnSize * 0.02 }]} />
        <View style={[styles.platformInner, { width: pawnSize * 0.70, height: pawnSize * 0.23, bottom: pawnSize * 0.07 }]} />
        <StaticPawn
          source={getPawnSource(selectedPawn)}
          fallbackSource={getLocalPawnFallback(selectedPawn)}
          rarity={selectedPawn.rarity}
          glowColor={selectedPawn.glowColor}
          size={pawnSize}
        />
      </View>

      <Animated.View
        style={[
          styles.bottom,
          {
            opacity: enter,
            transform: [{ translateY: contentTranslate }],
          },
        ]}
      >
        <View style={styles.xpCard}>
          <View style={styles.xpHead}>
            <View>
              <Text style={styles.xpEyebrow}>УРОВЕНЬ {level}</Text>
              <Text style={styles.xpTitle}>{formatNumber(stats.xp || 0)} XP</Text>
            </View>
            <Text style={styles.xpNext}>{currentLevelXp}/{nextLevelXp}</Text>
          </View>
          <ProgressBar progress={levelProgress} height={8} color="#b8f55b" />
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Открыть карту"
          activeOpacity={0.86}
          style={styles.primaryButton}
          onPress={() => navigation.navigate("Карта")}
        >
          <View style={styles.buttonIcon}>
            <Ionicons name="compass" size={25} color="#0b170c" />
          </View>
          <View style={styles.buttonCopy}>
            <Text style={styles.buttonTitle}>Первый шаг</Text>
            <Text style={styles.buttonSubtitle}>Открыть живую карту мира</Text>
          </View>
          <View style={styles.buttonArrow}>
            <Ionicons name="arrow-forward" size={21} color="#efffd3" />
          </View>
        </TouchableOpacity>

        <View style={styles.infoBlock}>
          <InfoStat icon="sparkles" value={stats.territories || 0} label="открытий" />
          <View style={styles.infoDivider} />
          <InfoStat icon="footsteps" value={formatDistance(stats.distanceKm)} label="путь" />
          <View style={styles.infoDivider} />
          <InfoStat icon="trophy" value={stats.achievements || 0} label="достижений" />
        </View>
      </Animated.View>

      <DailyJourneyCard
        journey={dailyJourney}
        onClose={async () => {
          await markEveningJourneyShown();
          setDailyJourney(null);
        }}
      />
    </View>
  );
}

function InfoStat({ icon, value, label }) {
  return (
    <View style={styles.infoStat}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color="#b8f55b" />
      </View>
      <Text numberOfLines={1} style={styles.infoValue}>{value}</Text>
      <Text numberOfLines={1} style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

function formatDistance(value) {
  const number = Number(value || 0);
  if (number < 1) return `${Math.round(number * 1000)} м`;
  return `${number.toFixed(number >= 10 ? 0 : 1)} км`;
}

function formatNumber(value) {
  return String(Number(value || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
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
  atmosphericMessage: {
    alignItems: "center",
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
    marginTop: 20,
    color: "#ffffff",
    fontSize: 39,
    lineHeight: 45,
    fontWeight: "900",
    letterSpacing: -1.3,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.76)",
    textShadowRadius: 15,
    textShadowOffset: { width: 0, height: 5 },
  },
  titleCompact: {
    marginTop: 15,
    fontSize: 34,
    lineHeight: 39,
  },
  goldText: {
    marginTop: 5,
    fontSize: 14,
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
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(183,238,89,0.20)",
    backgroundColor: "rgba(2,18,16,0.28)",
    transform: [{ scaleY: 0.46 }],
  },
  platformInner: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(244,196,81,0.17)",
    backgroundColor: "rgba(169,236,86,0.04)",
    transform: [{ scaleY: 0.45 }],
  },
  bottom: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 125,
    zIndex: 6,
  },
  xpCard: {
    paddingHorizontal: 17,
    paddingVertical: 13,
    borderRadius: 24,
    backgroundColor: "rgba(2, 24, 22, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(190, 240, 108, 0.16)",
    shadowColor: "#000",
    shadowOpacity: 0.34,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  xpHead: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  xpEyebrow: {
    color: "#b8f55b",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.8,
  },
  xpTitle: {
    marginTop: 4,
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  xpNext: {
    color: "rgba(255,255,255,0.48)",
    fontSize: 11,
    fontWeight: "800",
  },
  primaryButton: {
    minHeight: 74,
    marginTop: 10,
    paddingHorizontal: 11,
    borderRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(42, 108, 38, 0.97)",
    borderWidth: 1,
    borderColor: "rgba(205,255,112,0.55)",
    shadowColor: "#76c83c",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  buttonIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#b8f55b",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.42)",
  },
  buttonCopy: {
    flex: 1,
    marginLeft: 13,
  },
  buttonTitle: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "900",
  },
  buttonSubtitle: {
    marginTop: 3,
    color: "rgba(255,255,255,0.58)",
    fontSize: 10,
    fontWeight: "700",
  },
  buttonArrow: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(184, 238, 89, 0.12)",
  },
  infoBlock: {
    minHeight: 80,
    marginTop: 10,
    paddingHorizontal: 7,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(2, 20, 20, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  infoStat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(169, 236, 86, 0.09)",
  },
  infoValue: {
    marginTop: 3,
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  infoLabel: {
    marginTop: 1,
    color: "rgba(255,255,255,0.42)",
    fontSize: 8,
    fontWeight: "800",
  },
  infoDivider: {
    width: 1,
    height: 44,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
});
