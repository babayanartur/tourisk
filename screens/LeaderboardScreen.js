import React, { useEffect, useMemo, useState } from "react";
import { Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEFAULT_PAWNS, getGameContent, getLeaderboard } from "../services/gameService";
import { getPlayerStats } from "../services/playerStats";
import { getSelectedPawnSource } from "../services/assetResolver";

const leaderboardBg = require("../docs/mvp-yerevan/Leaderboard_v1.0.png");

const FILTERS = [
  { key: "global", label: "Общий рейтинг", icon: "globe-outline" },
  { key: "countries", label: "По странам", icon: "earth-outline" },
  { key: "today", label: "За сегодня", icon: "calendar-outline" },
  { key: "all", label: "За всё время", icon: "diamond-outline" },
];

export default function LeaderboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ xp: 0, territories: 0, achievements: 0 });
  const [filter, setFilter] = useState(FILTERS[0].key);
  const [pawns, setPawns] = useState(DEFAULT_PAWNS);

  const load = async () => {
    const [leaderboardItems, playerStats, content] = await Promise.all([getLeaderboard(), getPlayerStats(), getGameContent()]);
    setItems(leaderboardItems);
    setStats(playerStats);
    setPawns(content.pawns || DEFAULT_PAWNS);
  };

  useEffect(() => {
    load();
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation]);

  const normalized = useMemo(() => ensureLeaderboard(items), [items]);
  const topThree = normalized.slice(0, 3);
  const list = normalized.slice(3);
  const podiumOrder = [topThree[1], topThree[0], topThree[2]].filter(Boolean);

  return (
    <ImageBackground source={leaderboardBg} style={styles.bg} resizeMode="cover">
      <View style={styles.scrim} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 34 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.heroStats}>
          <HeroStat value={stats.xp || 0} label="XP" />
          <HeroStat value={stats.territories || 0} label="км²" />
          <HeroStat value={stats.achievements || 0} label="ачивки" />
        </View>

        <Text style={styles.title}>Рейтинг исследователей</Text>
        <Text style={styles.subtitle}>Путешествуй. Исследуй. Будь первым.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((item) => (
            <TouchableOpacity key={item.key} activeOpacity={0.85} style={[styles.filterPill, filter === item.key && styles.filterActive]} onPress={() => setFilter(item.key)}>
              <Ionicons name={item.icon} size={18} color={filter === item.key ? "#a9ec56" : "rgba(255,255,255,0.6)"} />
              <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.podiumScroll}>
          {podiumOrder.map((item) => {
            const place = normalized.findIndex((user) => user.id === item.id) + 1;
            return <PodiumCard key={item.id} item={item} place={place} first={place === 1} pawns={pawns} />;
          })}
        </ScrollView>

        <View style={styles.listPanel}>
          {list.map((item, index) => (
            <View key={item.id || `${item.nickname}-${index}`} style={styles.row}>
              <Text style={styles.place}>{index + 4}</Text>
              <Image source={getSelectedPawnSource(pawns, item.selectedPawn)} style={styles.rowPawn} />
              <View style={styles.rowBody}>
                <Text style={styles.rowName}>{item.nickname || "Explorer"}</Text>
                <Text style={styles.rowCountry}>📍 {item.country || "Мир"}</Text>
              </View>
              <Text style={styles.rowXp}>{formatNumber(item.xp || 0)} XP</Text>
              <Text style={styles.laurel}>❧</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

function HeroStat({ value, label }) {
  return (
    <View style={styles.heroStatItem}>
      <Text style={styles.heroStatText}>{formatNumber(value)}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function PodiumCard({ item, place, first, pawns }) {
  return (
    <View style={[styles.podiumCard, first && styles.firstPlace]}>
      <View style={[styles.medal, place === 2 && styles.silver, place === 3 && styles.bronze]}>
        <Text style={styles.medalText}>{place}</Text>
      </View>
      <View style={[styles.pawnCrown, first && styles.pawnCrownFirst]}>
        <Image source={getSelectedPawnSource(pawns, item.selectedPawn)} style={styles.podiumPawn} />
      </View>
      <Text numberOfLines={1} style={styles.podiumName}>{item.nickname || "Explorer"}</Text>
      <Text numberOfLines={1} style={styles.podiumCountry}>📍 {item.country || "Мир"}</Text>
      <Text style={styles.podiumXp}>{formatNumber(item.xp || 0)} XP</Text>
    </View>
  );
}

function ensureLeaderboard(items) {
  const base = items?.length ? items : [];
  const demos = [
    { id: "demo-artur", nickname: "Artur", country: "Армения", xp: 2580, selectedPawn: "pawn_green" },
    { id: "demo-liana", nickname: "Liana", country: "Грузия", xp: 1250, selectedPawn: "pawn_green" },
    { id: "demo-dmitry", nickname: "Dmitry", country: "Россия", xp: 980, selectedPawn: "pawn_green" },
    { id: "demo-alex", nickname: "Alex", country: "Турция", xp: 870, selectedPawn: "pawn_green" },
    { id: "demo-mariam", nickname: "Mariam", country: "ОАЭ", xp: 760, selectedPawn: "pawn_green" },
    { id: "demo-sergey", nickname: "Sergey", country: "Россия", xp: 650, selectedPawn: "pawn_green" },
    { id: "demo-anna", nickname: "Anna", country: "Египет", xp: 540, selectedPawn: "pawn_green" },
    { id: "demo-kenji", nickname: "Kenji", country: "Япония", xp: 430, selectedPawn: "pawn_green" },
    { id: "demo-lucas", nickname: "Lucas", country: "Бразилия", xp: 320, selectedPawn: "pawn_green" },
    { id: "demo-sophia", nickname: "Sophia", country: "Испания", xp: 210, selectedPawn: "pawn_green" },
  ];
  const map = new Map([...base, ...demos].map((item) => [item.id || item.nickname, item]));
  return Array.from(map.values()).sort((a, b) => (b.xp || 0) - (a.xp || 0));
}

function formatNumber(value) {
  return String(Number(value || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#04120d" },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(1, 11, 14, 0.48)" },
  content: { paddingBottom: 120 },
  heroStats: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 54, minHeight: 44 },
  heroStatItem: { minWidth: 68, alignItems: "center" },
  heroStatText: { color: "#fff", fontSize: 27, fontWeight: "900", textShadowColor: "rgba(0,0,0,0.86)", textShadowRadius: 10 },
  heroStatLabel: { color: "rgba(255,255,255,0.62)", fontSize: 11, fontWeight: "800" },
  title: { marginTop: 64, paddingHorizontal: 20, color: "#fff", fontSize: 33, fontWeight: "800", textAlign: "center", textShadowColor: "rgba(0,0,0,0.86)", textShadowRadius: 12 },
  subtitle: { marginTop: 7, paddingHorizontal: 20, color: "rgba(255,255,255,0.82)", fontSize: 16, fontWeight: "700", textAlign: "center" },
  filters: { marginTop: 30, paddingHorizontal: 12 },
  filterPill: { height: 48, paddingHorizontal: 14, borderRadius: 0, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(5, 20, 21, 0.88)", borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.08)" },
  filterActive: { backgroundColor: "rgba(118, 163, 43, 0.2)" },
  filterText: { color: "rgba(255,255,255,0.62)", fontSize: 14, fontWeight: "900" },
  filterTextActive: { color: "#a9ec56" },
  podiumScroll: { paddingHorizontal: 12, paddingTop: 38, paddingBottom: 8, gap: 16 },
  podiumCard: { width: 178, height: 232, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(5, 20, 21, 0.90)", borderWidth: 1, borderColor: "rgba(255,255,255,0.13)" },
  firstPlace: { width: 204, height: 262, borderColor: "rgba(244, 191, 66, 0.72)", backgroundColor: "rgba(73, 61, 11, 0.48)", shadowColor: "#f4bf42", shadowOpacity: 0.22, shadowRadius: 20 },
  medal: { position: "absolute", top: -20, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#f3c34d", borderWidth: 2, borderColor: "rgba(255,255,255,0.65)" },
  silver: { backgroundColor: "#c7d2dc" },
  bronze: { backgroundColor: "#c47d3c" },
  medalText: { color: "#2b2100", fontSize: 19, fontWeight: "900" },
  pawnCrown: { width: 108, height: 108, borderRadius: 54, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  pawnCrownFirst: { borderColor: "rgba(244, 191, 66, 0.68)", backgroundColor: "rgba(244, 191, 66, 0.13)" },
  podiumPawn: { width: 88, height: 88, resizeMode: "contain" },
  podiumName: { marginTop: 12, color: "#fff", fontSize: 20, fontWeight: "900" },
  podiumCountry: { marginTop: 4, color: "rgba(255,255,255,0.65)", fontSize: 14, fontWeight: "800" },
  podiumXp: { marginTop: 12, color: "#a9ec56", fontSize: 20, fontWeight: "900" },
  listPanel: { marginTop: 12, marginHorizontal: 0, overflow: "hidden", backgroundColor: "rgba(5, 20, 21, 0.88)", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  row: { minHeight: 70, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  place: { width: 28, color: "rgba(255,255,255,0.55)", fontWeight: "900" },
  rowPawn: { width: 46, height: 46, resizeMode: "contain" },
  rowBody: { flex: 1, marginLeft: 10 },
  rowName: { color: "#fff", fontSize: 17, fontWeight: "800" },
  rowCountry: { marginTop: 3, color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "800" },
  rowXp: { color: "#a9ec56", fontSize: 15, fontWeight: "900" },
  laurel: { marginLeft: 8, color: "#a9ec56", opacity: 0.5, fontSize: 20 },
});
