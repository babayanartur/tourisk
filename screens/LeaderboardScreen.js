import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import LivingWorld from "../components/LivingWorld";
import RarityAvatar from "../components/RarityAvatar";
import { rarityColor } from "../components/AnimatedPawn";
import { DEFAULT_PAWNS, getGameContent, getLeaderboard } from "../services/gameService";
import { getPlayerStats } from "../services/playerStats";
import { getStoredUser } from "../services/authService";
import { getLocalPawnFallback, getPawnSource, getSelectedPawn } from "../services/assetResolver";

const leaderboardBg = require("../assets/backgrounds/home-world-feedback.jpg");

const FILTERS = [
  { key: "global", label: "Общий", icon: "globe-outline" },
  { key: "countries", label: "Страны", icon: "earth-outline" },
  { key: "today", label: "Сегодня", icon: "calendar-outline" },
  { key: "all", label: "Всё время", icon: "infinite-outline" },
];

export default function LeaderboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ xp: 0, territories: 0, achievements: 0 });
  const [filter, setFilter] = useState("global");
  const [pawns, setPawns] = useState(DEFAULT_PAWNS);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [playerStats, content, storedUser] = await Promise.all([
      getPlayerStats(),
      getGameContent(),
      getStoredUser(),
    ]);
    setStats(playerStats);
    setPawns(content.pawns?.length ? content.pawns : DEFAULT_PAWNS);
    setCurrentUser(storedUser);
    setLoading(false);

    getLeaderboard()
      .then((leaderboardItems) => setItems(Array.isArray(leaderboardItems) ? leaderboardItems : []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const unsubscribe = navigation.addListener("focus", load);
    const liveTimer = setInterval(() => {
      getLeaderboard()
        .then((leaderboardItems) => setItems(Array.isArray(leaderboardItems) ? leaderboardItems : []))
        .catch(() => {});
      getPlayerStats().then(setStats).catch(() => {});
    }, 5000);
    return () => {
      unsubscribe?.();
      clearInterval(liveTimer);
    };
  }, [navigation]);

  const realUsers = useMemo(
    () => mergeCurrentUser(items, currentUser, stats),
    [currentUser, items, stats]
  );
  const filtered = useMemo(() => applyFilter(realUsers, filter), [filter, realUsers]);
  const topThree = filtered.slice(0, 3);
  const list = filtered.slice(3);
  const podiumOrder = [topThree[1], topThree[0], topThree[2]].filter(Boolean);
  const cardWidth = Math.max(101, Math.min(132, (width - 50) / 3));
  const currentIndex = filtered.findIndex((item) => isSameUser(item, currentUser));

  return (
    <View style={styles.root}>
      <LivingWorld source={leaderboardBg} fogOpacity={0.34} windOpacity={0.18} scrim="rgba(1, 9, 12, 0.54)" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandHeader}>
          <Text style={styles.logo}>TOURISK</Text>
          <View style={styles.brandRule}>
            <View style={styles.ruleLine} />
            <Text style={styles.ruleDiamond}>◇</Text>
            <View style={styles.ruleLine} />
          </View>
        </View>

        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.title}>Лучшие{`\n`}исследователи</Text>
            <Text style={styles.subtitle}>Здесь побеждает путь, а не громкость профиля.</Text>
          </View>
          <View style={styles.trophyButton}>
            <Ionicons name="trophy" size={25} color="#b8f55b" />
          </View>
        </View>

        <View style={styles.summaryCard}>
          <HeroStat icon="sparkles" value={stats.xp || 0} label="XP" />
          <View style={styles.summaryDivider} />
          <HeroStat icon="map" value={stats.territories || 0} label="открытий" />
          <View style={styles.summaryDivider} />
          <HeroStat icon="trophy" value={stats.achievements || 0} label="достижений" />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((item) => {
            const active = filter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.82}
                style={[styles.filterPill, active && styles.filterActive]}
                onPress={() => setFilter(item.key)}
              >
                <Ionicons name={item.icon} size={17} color={active ? "#08140d" : "rgba(255,255,255,0.58)"} />
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <EmptyState icon="hourglass-outline" title="Загружаем рейтинг" text="Собираем реальные данные исследователей." />
        ) : filtered.length ? (
          <>
            <View style={styles.podiumSection}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>Пьедестал мира</Text>
                <Text style={styles.sectionMeta}>{scoreLabel(filter)}</Text>
              </View>
              <View style={styles.podiumRow}>
                {podiumOrder.map((item) => {
                  const place = filtered.findIndex((user) => user.id === item.id) + 1;
                  return (
                    <PodiumCard
                      key={item.id || `${item.nickname}-${place}`}
                      item={item}
                      place={place}
                      first={place === 1}
                      pawns={pawns}
                      width={cardWidth}
                    />
                  );
                })}
              </View>
            </View>

            <View style={styles.listPanel}>
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>Исследователи</Text>
                <Text style={styles.listCount}>{filtered.length} в рейтинге</Text>
              </View>
              {list.map((item, index) => (
                <RankingRow
                  key={item.id || `${item.nickname}-${index}`}
                  item={item}
                  place={index + 4}
                  pawns={pawns}
                  current={isSameUser(item, currentUser)}
                />
              ))}
              {!list.length && topThree.length ? (
                <Text style={styles.shortListText}>В рейтинге пока только {topThree.length}. Новые участники появятся после реальных открытий.</Text>
              ) : null}
            </View>

            {currentUser && currentIndex >= 0 && currentIndex > 2 ? (
              <View style={styles.myPlaceCard}>
                <Text style={styles.myPlaceLabel}>МОЁ МЕСТО</Text>
                <Text style={styles.myPlaceNumber}>#{currentIndex + 1}</Text>
                <Text numberOfLines={1} style={styles.myPlaceName}>{currentUser.nickname || "Explorer"}</Text>
                <Text style={styles.myPlaceXp}>{formatNumber(filtered[currentIndex]?.xp || stats.xp)} XP</Text>
              </View>
            ) : null}
          </>
        ) : (
          <EmptyState icon="trophy-outline" title="Рейтинг пока пуст" text="Здесь появятся только настоящие пользователи после первых GPS-открытий." />
        )}
      </ScrollView>
    </View>
  );
}

function HeroStat({ icon, value, label }) {
  return (
    <View style={styles.heroStat}>
      <Ionicons name={icon} size={20} color="#b8f55b" />
      <Text style={styles.heroStatValue}>{formatNumber(value)}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function PodiumCard({ item, place, first, pawns, width }) {
  const pawn = getSelectedPawn(pawns, item.selectedPawn);
  const color = podiumColor(place, pawn);
  return (
    <View style={[styles.podiumCard, { width, borderColor: `${color}75` }, first && styles.firstPlace]}>
      <View style={[styles.podiumGlow, { backgroundColor: color, shadowColor: color }]} />
      <View style={[styles.medal, { backgroundColor: medalColor(place) }]}>
        <Text style={styles.medalText}>{place}</Text>
      </View>
      <RarityAvatar
        source={getPawnSource(pawn)}
        fallbackSource={getLocalPawnFallback(pawn)}
        rarity={pawn.rarity}
        glowColor={color}
        size={first ? 92 : 78}
        selected={first}
      />
      <Text numberOfLines={1} style={styles.podiumName}>{item.nickname || "Explorer"}</Text>
      <Text numberOfLines={1} style={styles.podiumCountry}>{countryLine(item)}</Text>
      <Text style={styles.podiumXp}>{formatNumber(item.xp || 0)}</Text>
      <Text style={styles.podiumXpLabel}>XP</Text>
    </View>
  );
}

function RankingRow({ item, place, pawns, current }) {
  const pawn = getSelectedPawn(pawns, item.selectedPawn);
  return (
    <View style={[styles.row, current && styles.currentRow]}>
      <Text style={[styles.place, current && styles.currentText]}>{place}</Text>
      <RarityAvatar
        source={getPawnSource(pawn)}
        fallbackSource={getLocalPawnFallback(pawn)}
        rarity={pawn.rarity}
        glowColor={pawn.glowColor}
        size={45}
        selected={current}
      />
      <View style={styles.rowCopy}>
        <Text numberOfLines={1} style={styles.rowName}>{current ? "Вы" : item.nickname || "Explorer"}</Text>
        <Text numberOfLines={1} style={styles.rowCountry}>{flagFor(item.country)} {normalizeCountry(item.country || "Мир")}</Text>
      </View>
      <Text style={styles.rowXp}>{formatNumber(item.xp || 0)} <Text style={styles.rowXpUnit}>XP</Text></Text>
    </View>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={27} color="#b8f55b" />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function mergeCurrentUser(items, currentUser, stats) {
  const cleanItems = (Array.isArray(items) ? items : []).filter((item) => item && !item.isBlocked);
  if (!currentUser) return cleanItems.sort((a, b) => Number(b.xp || 0) - Number(a.xp || 0));

  const local = {
    ...currentUser,
    id: currentUser.id || "local-user",
    xp: Math.max(Number(currentUser.xp || 0), Number(stats?.xp || 0)),
    achievementsCount: Math.max(Number(currentUser.achievementsCount || 0), Number(stats?.achievements || 0)),
    territories: Math.max(Number(currentUser.territories || 0), Number(stats?.territories || 0)),
    selectedPawn: currentUser.selectedPawn || stats?.selectedPawn || "pawn_green",
    country: normalizeCountry(
      currentUser.country
      || (Array.isArray(currentUser.countries) ? currentUser.countries[currentUser.countries.length - 1] : "")
      || "Мир"
    ),
  };

  const found = cleanItems.some((item) => isSameUser(item, local));
  const merged = found
    ? cleanItems.map((item) => (isSameUser(item, local) ? { ...item, ...local, xp: Math.max(Number(item.xp || 0), local.xp) } : item))
    : [...cleanItems, local];
  return merged.sort((a, b) => Number(b.xp || 0) - Number(a.xp || 0));
}

function applyFilter(items, filter) {
  if (filter === "countries") {
    const groups = new Map();
    items.forEach((item) => {
      const country = normalizeCountry(item.country || "Мир");
      const current = groups.get(country) || {
        id: `country-${country}`,
        nickname: country,
        country,
        xp: 0,
        members: 0,
        selectedPawn: item.selectedPawn || "pawn_green",
      };
      current.xp += Number(item.xp || 0);
      current.members += 1;
      groups.set(country, current);
    });
    return Array.from(groups.values()).sort((a, b) => b.xp - a.xp);
  }

  if (filter === "today") {
    const today = dateKey(new Date());
    return items
      .filter((item) => dateKey(item.updatedAt || item.lastActiveDate) === today)
      .sort((a, b) => Number(b.xp || 0) - Number(a.xp || 0));
  }

  return [...items].sort((a, b) => Number(b.xp || 0) - Number(a.xp || 0));
}

function scoreLabel(filter) {
  if (filter === "countries") return "сумма XP стран";
  if (filter === "today") return "активны сегодня";
  if (filter === "all") return "за всё время";
  return "общий рейтинг";
}

function isSameUser(item, user) {
  if (!item || !user) return false;
  if (item.id && user.id && item.id === user.id) return true;
  if (item.email && user.email && item.email === user.email) return true;
  return false;
}

function dateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function countryLine(item) {
  if (item.members) return `${item.members} исследователей`;
  const country = normalizeCountry(item.country || "Мир");
  return `${flagFor(country)} ${country}`;
}

function normalizeCountry(value) {
  const raw = String(value || "").trim();
  const lower = raw.toLowerCase();
  if (["kyrgyzstan", "kyrgyz republic", "киргизия", "кыргызстан", "кыргызская республика"].includes(lower)) return "Кыргызстан";
  return raw || "Мир";
}

function flagFor(country) {
  const value = String(country || "").toLowerCase();
  if (value.includes("кырг") || value.includes("kyrgyz")) return "🇰🇬";
  if (value.includes("каз")) return "🇰🇿";
  if (value.includes("арм")) return "🇦🇲";
  if (value.includes("груз")) return "🇬🇪";
  if (value.includes("рос")) return "🇷🇺";
  if (value.includes("итал")) return "🇮🇹";
  if (value.includes("япон")) return "🇯🇵";
  if (value.includes("исп")) return "🇪🇸";
  if (value.includes("фран")) return "🇫🇷";
  return "🌍";
}

function podiumColor(place, pawn) {
  if (place === 1) return "#f4c451";
  if (place === 2) return "#b6c5d3";
  if (place === 3) return "#e58a48";
  return pawn?.glowColor || rarityColor(pawn?.rarity);
}

function medalColor(place) {
  if (place === 1) return "#f4c451";
  if (place === 2) return "#d8e3eb";
  return "#e58a48";
}

function formatNumber(value) {
  return String(Number(value || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#020d0d",
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 164,
  },
  brandHeader: {
    alignItems: "center",
  },
  logo: {
    color: "rgba(255,255,255,0.94)",
    fontSize: 24,
    fontWeight: "300",
    letterSpacing: 8,
  },
  brandRule: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ruleLine: {
    width: 49,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  ruleDiamond: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 13,
  },
  titleRow: {
    marginTop: 17,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  titleCopy: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 34,
    lineHeight: 37,
    fontWeight: "900",
    letterSpacing: -1.1,
  },
  subtitle: {
    marginTop: 7,
    color: "rgba(255,255,255,0.48)",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
  },
  trophyButton: {
    width: 55,
    height: 55,
    marginTop: 2,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(169,236,86,0.10)",
    borderWidth: 1,
    borderColor: "rgba(169,236,86,0.24)",
  },
  summaryCard: {
    minHeight: 104,
    marginTop: 16,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(2,24,22,0.94)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  heroStat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroStatValue: {
    marginTop: 5,
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  heroStatLabel: {
    marginTop: 2,
    color: "rgba(255,255,255,0.39)",
    fontSize: 8,
    fontWeight: "800",
  },
  summaryDivider: {
    width: 1,
    height: 48,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  filters: {
    gap: 9,
    paddingTop: 15,
    paddingRight: 15,
  },
  filterPill: {
    minHeight: 49,
    paddingHorizontal: 16,
    borderRadius: 19,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(3,25,23,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  filterActive: {
    backgroundColor: "#b8f55b",
    borderColor: "#c9ff78",
  },
  filterText: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 11,
    fontWeight: "900",
  },
  filterTextActive: {
    color: "#08140d",
  },
  podiumSection: {
    marginTop: 18,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  sectionMeta: {
    color: "rgba(255,255,255,0.39)",
    fontSize: 9,
    fontWeight: "800",
  },
  podiumRow: {
    minHeight: 278,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 7,
  },
  podiumCard: {
    minHeight: 244,
    paddingHorizontal: 8,
    paddingTop: 22,
    paddingBottom: 13,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
    backgroundColor: "rgba(2,24,23,0.94)",
    borderWidth: 1,
  },
  firstPlace: {
    minHeight: 276,
    backgroundColor: "rgba(67,50,14,0.82)",
  },
  podiumGlow: {
    position: "absolute",
    top: 48,
    width: 94,
    height: 94,
    borderRadius: 47,
    opacity: 0.14,
    shadowOpacity: 0.72,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  medal: {
    position: "absolute",
    top: -1,
    width: 39,
    height: 39,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  medalText: {
    color: "#1a160c",
    fontSize: 17,
    fontWeight: "900",
  },
  podiumName: {
    marginTop: 7,
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  podiumCountry: {
    marginTop: 4,
    color: "rgba(255,255,255,0.46)",
    fontSize: 8,
    fontWeight: "700",
  },
  podiumXp: {
    marginTop: 8,
    color: "#b8f55b",
    fontSize: 17,
    fontWeight: "900",
  },
  podiumXpLabel: {
    marginTop: 1,
    color: "rgba(255,255,255,0.35)",
    fontSize: 7,
    fontWeight: "800",
  },
  listPanel: {
    marginTop: 14,
    borderRadius: 25,
    padding: 11,
    backgroundColor: "rgba(2,22,21,0.94)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  listHeader: {
    paddingHorizontal: 5,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listHeaderText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
  },
  listCount: {
    color: "rgba(255,255,255,0.38)",
    fontSize: 9,
    fontWeight: "800",
  },
  row: {
    minHeight: 70,
    marginTop: 7,
    paddingHorizontal: 11,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.025)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  currentRow: {
    backgroundColor: "rgba(74,126,36,0.34)",
    borderColor: "rgba(184,245,91,0.76)",
  },
  place: {
    width: 28,
    color: "rgba(255,255,255,0.48)",
    fontSize: 15,
    fontWeight: "900",
  },
  currentText: {
    color: "#b8f55b",
  },
  rowCopy: {
    flex: 1,
    marginLeft: 9,
  },
  rowName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  rowCountry: {
    marginTop: 3,
    color: "rgba(255,255,255,0.43)",
    fontSize: 9,
    fontWeight: "700",
  },
  rowXp: {
    color: "#b8f55b",
    fontSize: 14,
    fontWeight: "900",
  },
  rowXpUnit: {
    fontSize: 8,
    color: "rgba(184,245,91,0.68)",
  },
  shortListText: {
    paddingHorizontal: 7,
    paddingVertical: 18,
    color: "rgba(255,255,255,0.42)",
    fontSize: 9,
    lineHeight: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  myPlaceCard: {
    minHeight: 73,
    marginTop: 12,
    paddingHorizontal: 16,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(52,106,31,0.44)",
    borderWidth: 1,
    borderColor: "rgba(184,245,91,0.42)",
  },
  myPlaceLabel: {
    color: "rgba(255,255,255,0.43)",
    fontSize: 7,
    fontWeight: "900",
  },
  myPlaceNumber: {
    marginLeft: 6,
    color: "#b8f55b",
    fontSize: 18,
    fontWeight: "900",
  },
  myPlaceName: {
    flex: 1,
    marginLeft: 12,
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
  myPlaceXp: {
    color: "#b8f55b",
    fontSize: 13,
    fontWeight: "900",
  },
  emptyState: {
    minHeight: 210,
    marginTop: 20,
    borderRadius: 27,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2,23,22,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(169,236,86,0.10)",
  },
  emptyTitle: {
    marginTop: 14,
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  emptyText: {
    marginTop: 7,
    color: "rgba(255,255,255,0.46)",
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
    textAlign: "center",
  },
});
