import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getStoredUser, logout, updateProfile } from "../services/authService";
import { DEFAULT_ACHIEVEMENTS, DEFAULT_PAWNS, getGameContent } from "../services/gameService";
import { getPlayerStats } from "../services/playerStats";
import { STORAGE_KEYS } from "../services/storageKeys";
import { getPawnSource } from "../services/assetResolver";

const profileBg = require("../docs/mvp-yerevan/Profile_v1.1.png");
const pawnGreen = require("../assets/player/pawn_green.png");

export default function ProfileScreen({ navigation, onLogout }) {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState("");
  const [stats, setStats] = useState({ xp: 0, exploredKm2: 0, cities: 0, countries: 0, achievements: 0, level: 1, coins: 0 });
  const [content, setContent] = useState({ achievements: DEFAULT_ACHIEVEMENTS, pawns: DEFAULT_PAWNS });
  const [checkins, setCheckins] = useState([]);

  const load = async () => {
    const [storedUser, playerStats, gameContent, checkinsRaw] = await Promise.all([
      getStoredUser(),
      getPlayerStats(),
      getGameContent(),
      AsyncStorage.getItem(STORAGE_KEYS.checkins),
    ]);
    setUser(storedUser);
    setNickname(storedUser?.nickname || "Explorer");
    setStats(playerStats);
    setContent(gameContent);
    setCheckins(checkinsRaw ? JSON.parse(checkinsRaw) : []);
  };

  useEffect(() => {
    load();
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation]);

  const selectedPawn = useMemo(() => content.pawns.find((item) => item.id === user?.selectedPawn) || content.pawns[0] || DEFAULT_PAWNS[0], [content.pawns, user?.selectedPawn]);
  const recent = checkins.slice(-6).reverse();
  const countries = useMemo(() => Array.from(new Set(checkins.map((item) => item.country).filter(Boolean))).slice(0, 7), [checkins]);

  const saveNickname = async () => {
    if (!nickname.trim()) {
      Alert.alert("Профиль", "Никнейм не должен быть пустым. Даже пешке нужно имя, так уж устроен мир.");
      return;
    }
    const updated = await updateProfile({ nickname: nickname.trim() });
    setUser(updated);
    Alert.alert("Готово", "Никнейм обновлен.");
  };

  const selectPawn = async (pawn) => {
    if (!isPawnUnlocked(pawn, stats)) return;
    const updated = await updateProfile({ selectedPawn: pawn.id });
    setUser(updated);
  };

  const handleLogout = async () => {
    await logout();
    onLogout?.();
  };

  return (
    <ImageBackground source={profileBg} style={styles.bg} resizeMode="cover">
      <View style={styles.scrim} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 36 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <TouchableOpacity activeOpacity={0.85} style={styles.settingsButton}>
            <Ionicons name="settings" size={22} color="rgba(255,255,255,0.88)" />
          </TouchableOpacity>

          <View style={styles.identityRow}>
            <View style={styles.avatarRing}>
              <Image source={getPawnSource(selectedPawn)} style={styles.avatarPawn} />
            </View>

            <View style={styles.identityBody}>
              <Text numberOfLines={1} style={styles.name}>{user?.nickname || "Explorer"}</Text>
              <Text style={styles.titleLabel}>🌿 Explorer</Text>
              <Text style={styles.locationText}>📍 {lastKnownPlace(checkins)}</Text>
            </View>
          </View>

          <View style={styles.heroNumbers}>
            <TopNumber value={stats.countries || 0} label="Страна" />
            <TopNumber value={stats.cities || 0} label="Город" />
            <TopNumber value={stats.exploredKm2 || 0} label="км²" />
          </View>
        </View>

        <View style={styles.statStrip}>
          <ProfileStat icon="🌍" value={stats.countries || 0} label="Страна" />
          <ProfileStat icon="🏙" value={stats.cities || 0} label="Город" />
          <ProfileStat icon="🌿" value={stats.exploredKm2 || 0} label="Открыто" />
          <ProfileStat icon="⭐" value={stats.xp || 0} label="XP" />
          <ProfileStat icon="🏆" value={stats.achievements || 0} label="Достижение" />
        </View>

        <Panel title="Последние открытия" action="Все">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
            {(recent.length ? recent : demoCheckins()).map((item) => (
              <View key={item.id || item.title} style={styles.discoveryCard}>
                <Image source={profileBg} style={styles.discoveryImage} />
                <View style={styles.discoveryShade} />
                <Text numberOfLines={1} style={styles.discoveryTitle}>{item.title || item.city}</Text>
                <Text numberOfLines={1} style={styles.discoveryPlace}>{item.country || "Мир"}</Text>
                <Text style={styles.discoveryXp}>+{item.xp || 20} XP</Text>
              </View>
            ))}
          </ScrollView>
        </Panel>

        <Panel title="Достижения" action="Все">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementsRow}>
            {content.achievements.slice(0, 8).map((item, index) => {
              const unlocked = index < Math.max(1, stats.achievements || 0);
              return (
                <View key={item.id} style={[styles.achievementCard, !unlocked && styles.locked]}>
                  <Text style={styles.achievementIcon}>{unlocked ? item.icon || "🏅" : "🔒"}</Text>
                  <Text numberOfLines={2} style={styles.achievementTitle}>{item.title}</Text>
                  <Text numberOfLines={2} style={styles.achievementText}>{item.description}</Text>
                </View>
              );
            })}
          </ScrollView>
        </Panel>

        <Panel title="Коллекция фигурок" action="Все фигурки">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pawnRow}>
            {content.pawns.map((pawn) => {
              const unlocked = isPawnUnlocked(pawn, stats);
              const selected = user?.selectedPawn === pawn.id || (!user?.selectedPawn && pawn.id === "pawn_green");
              return (
                <TouchableOpacity key={pawn.id} activeOpacity={0.86} style={[styles.pawnCard, selected && styles.pawnSelected, !unlocked && styles.locked]} onPress={() => selectPawn(pawn)}>
                  <Image source={unlocked ? getPawnSource(pawn) : pawnGreen} style={styles.pawnImage} />
                  {!unlocked && <View style={styles.lockBubble}><Ionicons name="lock-closed" size={18} color="#d7d7d7" /></View>}
                  <Text numberOfLines={1} style={styles.pawnName}>{pawn.name}</Text>
                  <Text style={styles.pawnState}>{selected ? "Используется" : unlocked ? "Доступна" : "Не получено"}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Panel>

        <Panel title="Общий путь">
          <View style={styles.pathPanel}>
            <View style={styles.miniMap}>
              <View style={styles.greenBlobOne} />
              <View style={styles.greenBlobTwo} />
              <Text style={styles.mapCaption}>Посещённые страны</Text>
            </View>
            <View style={styles.flagsWrap}>
              <Text style={styles.flagsTitle}>Известные страны</Text>
              <View style={styles.flagRow}>
                {(countries.length ? countries : ["Армения", "Турция", "Грузия", "ОАЭ"]).map((country) => (
                  <View key={country} style={styles.flagBadge}><Text style={styles.flagText}>{flagFor(country)}</Text></View>
                ))}
              </View>
            </View>
          </View>
        </Panel>

        <Panel title="Редактировать профиль">
          <TextInput value={nickname} onChangeText={setNickname} placeholder="Никнейм" placeholderTextColor="rgba(255,255,255,0.42)" style={styles.input} />
          <TouchableOpacity activeOpacity={0.86} style={styles.saveButton} onPress={saveNickname}>
            <Text style={styles.saveText}>Сохранить никнейм</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.86} style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Выйти</Text>
          </TouchableOpacity>
        </Panel>
      </ScrollView>
    </ImageBackground>
  );
}

function Panel({ title, action, children }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHead}>
        <Text style={styles.panelTitle}>{title}</Text>
        {action ? <Text style={styles.seeAll}>{action}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function TopNumber({ value, label }) {
  return (
    <View style={styles.topNumber}>
      <Text style={styles.topNumberValue}>{value}</Text>
      <Text style={styles.topNumberLabel}>{label}</Text>
    </View>
  );
}

function ProfileStat({ icon, value, label }) {
  return (
    <View style={styles.profileStat}>
      <Text style={styles.profileStatIcon}>{icon}</Text>
      <Text style={styles.profileStatValue}>{value}</Text>
      <Text style={styles.profileStatLabel}>{label}</Text>
    </View>
  );
}

function isPawnUnlocked(pawn, stats) {
  if (!pawn) return false;
  const value = Number(pawn.unlockValue || 1);
  if (pawn.unlockType === "cells") return (stats.territories || 0) >= value;
  if (pawn.unlockType === "cities") return (stats.cities || 0) >= value;
  if (pawn.unlockType === "countries") return (stats.countries || 0) >= value;
  if (pawn.unlockType === "xp") return (stats.xp || 0) >= value;
  return (stats.level || 1) >= value;
}

function lastKnownPlace(checkins) {
  const item = checkins[checkins.length - 1];
  if (!item) return "Ереван, Армения";
  return `${item.title || item.city || "Мир"}, ${item.country || "Планета"}`;
}

function demoCheckins() {
  return [
    { id: "demo-1", title: "Каскад", country: "Ереван, Армения", xp: 50 },
    { id: "demo-2", title: "Площадь Республики", country: "Ереван, Армения", xp: 30 },
    { id: "demo-3", title: "Матенадаран", country: "Ереван, Армения", xp: 20 },
  ];
}

function flagFor(country) {
  const value = String(country || "").toLowerCase();
  if (value.includes("арм")) return "🇦🇲";
  if (value.includes("тур")) return "🇹🇷";
  if (value.includes("груз")) return "🇬🇪";
  if (value.includes("оаэ") || value.includes("emir")) return "🇦🇪";
  if (value.includes("кырг")) return "🇰🇬";
  if (value.includes("рос")) return "🇷🇺";
  return "🌍";
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#04120d" },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 10, 13, 0.42)" },
  content: { paddingBottom: 122 },
  hero: { minHeight: 286, paddingHorizontal: 18, justifyContent: "flex-end", paddingBottom: 16 },
  settingsButton: {
    position: "absolute", top: 40, right: 18, width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center", backgroundColor: "rgba(5, 18, 20, 0.6)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  identityRow: { flexDirection: "row", alignItems: "center" },
  avatarRing: {
    width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 2, borderColor: "rgba(255,255,255,0.35)", overflow: "hidden",
  },
  avatarPawn: { width: 108, height: 108, resizeMode: "contain" },
  identityBody: { flex: 1, marginLeft: 15, paddingTop: 12 },
  name: { color: "#fff", fontSize: 38, fontWeight: "900", letterSpacing: -1, textShadowColor: "rgba(0,0,0,0.75)", textShadowRadius: 10 },
  titleLabel: { marginTop: 6, color: "#a9ec56", fontSize: 18, fontWeight: "900" },
  locationText: { marginTop: 8, color: "rgba(255,255,255,0.72)", fontSize: 15, fontWeight: "800" },
  heroNumbers: { marginTop: 10, marginLeft: 134, flexDirection: "row", justifyContent: "space-between" },
  topNumber: { alignItems: "center", minWidth: 58 },
  topNumberValue: { color: "#fff", fontSize: 28, fontWeight: "900" },
  topNumberLabel: { color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: "800" },
  statStrip: {
    minHeight: 100, flexDirection: "row", backgroundColor: "rgba(1, 16, 20, 0.92)",
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  profileStat: { flex: 1, alignItems: "center", justifyContent: "center", borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.06)" },
  profileStatIcon: { fontSize: 31 },
  profileStatValue: { marginTop: 4, color: "#fff", fontSize: 22, fontWeight: "900" },
  profileStatLabel: { marginTop: 3, color: "rgba(255,255,255,0.62)", fontSize: 11, fontWeight: "800", textAlign: "center" },
  panel: { paddingHorizontal: 10, paddingTop: 18 },
  panelHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, marginBottom: 11 },
  panelTitle: { color: "rgba(255,255,255,0.88)", fontSize: 20, fontWeight: "900" },
  seeAll: { color: "rgba(255,255,255,0.72)", fontSize: 15, fontWeight: "800" },
  recentRow: { gap: 12, paddingRight: 16 },
  discoveryCard: { width: 178, height: 156, borderRadius: 18, overflow: "hidden", backgroundColor: "rgba(4, 22, 25, 0.92)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  discoveryImage: { position: "absolute", width: "100%", height: 92, resizeMode: "cover" },
  discoveryShade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 100, backgroundColor: "rgba(0, 17, 20, 0.82)" },
  discoveryTitle: { marginTop: 92, paddingHorizontal: 12, color: "#fff", fontSize: 16, fontWeight: "900" },
  discoveryPlace: { marginTop: 4, paddingHorizontal: 12, color: "rgba(255,255,255,0.66)", fontSize: 12, fontWeight: "700" },
  discoveryXp: { marginTop: 5, paddingHorizontal: 12, color: "#a9ec56", fontSize: 13, fontWeight: "900" },
  achievementsRow: { gap: 12, paddingRight: 16 },
  achievementCard: { width: 132, minHeight: 132, borderRadius: 18, padding: 12, backgroundColor: "rgba(5, 24, 28, 0.9)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  locked: { opacity: 0.48 },
  achievementIcon: { fontSize: 34, textAlign: "center" },
  achievementTitle: { marginTop: 8, color: "#f3d18b", fontSize: 13, fontWeight: "900", textAlign: "center" },
  achievementText: { marginTop: 5, color: "rgba(255,255,255,0.62)", fontSize: 11, lineHeight: 15, fontWeight: "700", textAlign: "center" },
  pawnRow: { gap: 12, paddingRight: 16 },
  pawnCard: { width: 142, height: 158, borderRadius: 20, padding: 12, alignItems: "center", backgroundColor: "rgba(5, 24, 28, 0.92)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  pawnSelected: { borderColor: "#a9ec56", backgroundColor: "rgba(127, 170, 55, 0.18)" },
  pawnImage: { width: 80, height: 80, resizeMode: "contain" },
  lockBubble: { position: "absolute", top: 44, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.48)" },
  pawnName: { marginTop: 7, color: "#fff", fontSize: 13, fontWeight: "900", textAlign: "center" },
  pawnState: { marginTop: 4, color: "#a9ec56", fontSize: 12, fontWeight: "900" },
  pathPanel: { minHeight: 142, borderRadius: 22, padding: 14, backgroundColor: "rgba(5, 24, 28, 0.88)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", flexDirection: "row", gap: 14 },
  miniMap: { flex: 1, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden", justifyContent: "flex-end", padding: 10 },
  greenBlobOne: { position: "absolute", left: 36, bottom: 40, width: 70, height: 34, borderRadius: 30, backgroundColor: "rgba(169,236,86,0.32)" },
  greenBlobTwo: { position: "absolute", right: 24, top: 30, width: 48, height: 26, borderRadius: 20, backgroundColor: "rgba(169,236,86,0.22)" },
  mapCaption: { color: "rgba(255,255,255,0.66)", fontWeight: "800" },
  flagsWrap: { flex: 1.2, justifyContent: "center" },
  flagsTitle: { color: "rgba(255,255,255,0.72)", fontSize: 14, fontWeight: "900", marginBottom: 12 },
  flagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  flagBadge: { width: 42, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  flagText: { fontSize: 22 },
  input: { height: 52, borderRadius: 17, paddingHorizontal: 15, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 17, fontWeight: "800" },
  saveButton: { marginTop: 10, height: 50, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#a9ec56" },
  saveText: { color: "#06120d", fontSize: 16, fontWeight: "900" },
  logoutButton: { marginTop: 12, height: 52, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255, 67, 67, 0.14)", borderWidth: 1, borderColor: "rgba(255, 107, 107, 0.28)" },
  logoutText: { color: "#ffb0b0", fontSize: 16, fontWeight: "900" },
});
