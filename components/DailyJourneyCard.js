import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import LivingWorld from "./LivingWorld";
import { formatJourneyDistance, formatJourneyDuration } from "../services/dailyJourney";

const journeyBackground = require("../assets/backgrounds/home-world-clean.jpg");

export default function DailyJourneyCard({ journey, onClose }) {
  const insets = useSafeAreaInsets();
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!journey) return undefined;
    reveal.setValue(0);
    const animation = Animated.timing(reveal, {
      toValue: 1,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [journey, reveal]);

  if (!journey) return null;

  const placeCount = Array.isArray(journey.placeIds) ? journey.placeIds.length : 0;
  const hasProgress = placeCount > 0 || Number(journey.newTerritories || 0) > 0 || Number(journey.distanceMeters || 0) > 0;
  const translateY = reveal.interpolate({ inputRange: [0, 1], outputRange: [26, 0] });

  const close = () => {
    Animated.timing(reveal, {
      toValue: 0,
      duration: 620,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onClose?.());
  };

  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={close}>
      <View style={styles.root}>
        <LivingWorld
          source={journeyBackground}
          fogOpacity={0.34}
          windOpacity={0.18}
          scrim="rgba(1, 14, 16, 0.46)"
          bottomShade="rgba(0, 9, 10, 0.65)"
        />

        <Animated.View
          style={[
            styles.content,
            {
              paddingTop: insets.top + 24,
              paddingBottom: Math.max(insets.bottom + 28, 36),
              opacity: reveal,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>ИТОГИ ДНЯ</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Закрыть итоги дня" onPress={close} style={styles.closeButton}>
              <Ionicons name="close" size={21} color="#f3ffe0" />
            </Pressable>
          </View>

          <View style={styles.centerCopy}>
            <Text style={styles.title}>Сегодня ты прошёл</Text>
            <Text style={styles.distance}>{formatJourneyDistance(journey.distanceMeters)}</Text>
            <View style={styles.sunRule}>
              <View style={styles.ruleLine} />
              <Text style={styles.ruleSymbol}>✦</Text>
              <View style={styles.ruleLine} />
            </View>
          </View>

          <View style={styles.statsCard}>
            <JourneyStat icon="earth" label="Исследовал" value={`${placeCount} ${pluralize(placeCount, "новое место", "новых места", "новых мест")}`} />
            <View style={styles.divider} />
            <JourneyStat icon="compass" label="Открыл" value={`${Number(journey.newTerritories || 0)} ${pluralize(Number(journey.newTerritories || 0), "новую территорию", "новые территории", "новых территорий")}`} />
            <View style={styles.divider} />
            <JourneyStat icon="time" label="Провёл в исследовании" value={formatJourneyDuration(journey.explorationSeconds)} />
          </View>

          <View style={styles.spacer} />

          <View style={styles.footerCard}>
            <Text style={styles.footerText}>
              {hasProgress
                ? "Сегодня твой мир стал немного больше."
                : "Сегодня ты не исследовал новые места.\n\nЗавтра можно продолжить свой путь."}
            </Text>
            <Pressable accessibilityRole="button" onPress={close} style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}>
              <Text style={styles.actionText}>Сохранить этот день</Text>
              <Ionicons name="bookmark-outline" size={20} color="#102014" />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function JourneyStat({ icon, label, value }) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={21} color="#f4d27b" />
      </View>
      <View style={styles.statCopy}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

function pluralize(value, one, few, many) {
  const number = Math.abs(Number(value || 0)) % 100;
  const tail = number % 10;
  if (number > 10 && number < 20) return many;
  if (tail === 1) return one;
  if (tail >= 2 && tail <= 4) return few;
  return many;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#031112",
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: "#f4d27b",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2.6,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(3, 25, 23, 0.76)",
    borderWidth: 1,
    borderColor: "rgba(228, 255, 194, 0.18)",
  },
  centerCopy: {
    marginTop: 42,
    alignItems: "center",
  },
  title: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 17,
    fontWeight: "700",
  },
  distance: {
    marginTop: 7,
    color: "#fffdf3",
    fontSize: 52,
    lineHeight: 58,
    fontWeight: "300",
    letterSpacing: -1.8,
    textShadowColor: "rgba(244, 210, 123, 0.40)",
    textShadowRadius: 18,
  },
  sunRule: {
    width: 170,
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ruleLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(244, 210, 123, 0.30)",
  },
  ruleSymbol: {
    color: "#f4d27b",
    fontSize: 15,
  },
  statsCard: {
    marginTop: 34,
    paddingHorizontal: 17,
    borderRadius: 28,
    backgroundColor: "rgba(3, 25, 23, 0.84)",
    borderWidth: 1,
    borderColor: "rgba(211, 244, 154, 0.16)",
    shadowColor: "#000",
    shadowOpacity: 0.38,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
  },
  statRow: {
    minHeight: 83,
    flexDirection: "row",
    alignItems: "center",
  },
  statIcon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244, 210, 123, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(244, 210, 123, 0.18)",
  },
  statCopy: {
    flex: 1,
    marginLeft: 13,
  },
  statLabel: {
    color: "rgba(255,255,255,0.43)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  statValue: {
    marginTop: 4,
    color: "#f7ffe9",
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
  },
  divider: {
    height: 1,
    marginLeft: 59,
    backgroundColor: "rgba(255,255,255,0.075)",
  },
  spacer: {
    flex: 1,
    minHeight: 22,
  },
  footerCard: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: "rgba(2, 19, 18, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(244, 210, 123, 0.18)",
  },
  footerText: {
    color: "rgba(255,255,255,0.79)",
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "600",
    textAlign: "center",
  },
  actionButton: {
    marginTop: 18,
    minHeight: 58,
    paddingHorizontal: 18,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#dff59c",
  },
  actionButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  actionText: {
    color: "#102014",
    fontSize: 15,
    fontWeight: "900",
  },
});
