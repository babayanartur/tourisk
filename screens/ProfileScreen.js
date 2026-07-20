import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { rarityColor } from "../components/AnimatedPawn";
import StaticPawn from "../components/StaticPawn";
import LivingWorld from "../components/LivingWorld";
import ProgressBar from "../components/ProgressBar";
import RarityAvatar from "../components/RarityAvatar";
import ResilientImage from "../components/ResilientImage";
import TravelGeographyCard from "../components/TravelGeographyCard";
import { getStoredUser, updateProfile } from "../services/authService";
import { DEFAULT_ACHIEVEMENTS, DEFAULT_PAWNS, getGameContent, refreshGameContent } from "../services/gameService";
import { getPlayerStats } from "../services/playerStats";
import { isRequirementMet, requirementProgress } from "../services/progression";
import { STORAGE_KEYS } from "../services/storageKeys";
import { getContentImageSource, getLocalPawnFallback, getPawnSource } from "../services/assetResolver";
import SettingsScreen from "./SettingsScreen";

const profileBg = require("../assets/backgrounds/home-world-feedback.jpg");
const discoveryBg = require("../assets/backgrounds/home-world-feedback.jpg");

export default function ProfileScreen({ navigation, onLogout }) {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    xp: 0,
    exploredKm2: 0,
    cities: 0,
    countries: 0,
    achievements: 0,
    level: 1,
    coins: 0,
    distanceKm: 0,
    stepsCount: 0,
    legendaryPlaces: 0,
    hiddenPlaces: 0,
    streakDays: 1,
  });
  const [content, setContent] = useState({ achievements: DEFAULT_ACHIEVEMENTS, pawns: DEFAULT_PAWNS, places: [] });
  const [checkins, setCheckins] = useState([]);
  const [openedPlaces, setOpenedPlaces] = useState([]);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const load = async () => {
    const [storedUser, playerStats, gameContent, checkinsRaw, openedRaw] = await Promise.all([
      getStoredUser(),
      getPlayerStats(),
      getGameContent(),
      AsyncStorage.getItem(STORAGE_KEYS.checkins),
      AsyncStorage.getItem(STORAGE_KEYS.openedLegendaryPlaces),
    ]);
    setUser(storedUser);
    setStats(playerStats);
    setContent(gameContent);
    setCheckins(checkinsRaw ? JSON.parse(checkinsRaw) : []);
    setOpenedPlaces(playerStats.openedPlaces?.length ? playerStats.openedPlaces : (openedRaw ? JSON.parse(openedRaw) : []));
  };

  useEffect(() => {
    load();
    refreshGameContent().then(setContent).catch(() => {});
    const unsubscribe = navigation.addListener("focus", load);
    return () => unsubscribe?.();
  }, [navigation]);

  const selectedPawn = useMemo(
    () => content.pawns.find((item) => item.id === user?.selectedPawn) || content.pawns[0] || DEFAULT_PAWNS[0],
    [content.pawns, user?.selectedPawn]
  );

  const discoveries = useMemo(() => {
    const placeItems = openedPlaces
      .map((id) => content.places.find((place) => place.id === id))
      .filter(Boolean)
      .map((place) => ({
        ...place,
        id: place.id,
        title: place.name,
        country: `${place.city || "Мир"}, ${place.country || "Земля"}`,
        xp: place.xp || 50,
      }));

    const cityItems = checkins.map((item) => ({
      ...item,
      title: item.title || item.city,
      rarity: "city",
    }));

    const merged = [...cityItems, ...placeItems];
    const map = new Map(merged.map((item) => [item.id || `${item.title}-${item.country}`, item]));
    return Array.from(map.values()).slice(-8).reverse();
  }, [checkins, content.places, openedPlaces]);

  const selectPawn = async (pawn) => {
    if (!isRequirementMet(pawn, stats)) return;
    const updated = await updateProfile({ selectedPawn: pawn.id });
    setUser(updated);
  };

  return (
    <View style={styles.root}>
      <LivingWorld source={profileBg} fogOpacity={0.34} windOpacity={0.25} scrim="rgba(0, 9, 12, 0.39)" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 15 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <View>
            <Text style={styles.pageEyebrow}>ПРОФИЛЬ ИССЛЕДОВАТЕЛЯ</Text>
            <Text style={styles.pageTitle}>Твой живой мир</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Открыть настройки"
            activeOpacity={0.84}
            style={styles.settingsButton}
            onPress={() => setSettingsVisible(true)}
          >
            <Ionicons name="settings-outline" size={23} color="#ffffff" />
            <View style={styles.settingsGlow} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.identityRow}>
            <View style={[styles.avatarStage, { borderColor: `${rarityColor(selectedPawn.rarity)}66` }]}> 
              <StaticPawn
                source={getPawnSource(selectedPawn)}
                fallbackSource={getLocalPawnFallback(selectedPawn)}
                rarity={selectedPawn.rarity}
                glowColor={selectedPawn.glowColor}
                size={124}
              />
            </View>

            <View style={styles.identityBody}>
              <Text numberOfLines={1} style={styles.name}>{user?.nickname || "Explorer"}</Text>
              <View style={styles.explorerBadge}>
                <Ionicons name="leaf" size={13} color="#b7ee59" />
                <Text style={styles.titleLabel}>Исследователь мира</Text>
              </View>
              <Text numberOfLines={1} style={styles.locationText}>📍 {lastKnownPlace(checkins)}</Text>
              <View style={styles.rarityBadge}>
                <View style={[styles.rarityDot, { backgroundColor: rarityColor(selectedPawn.rarity) }]} />
                <Text style={styles.rarityText}>{rarityLabel(selectedPawn.rarity)} фигурка</Text>
              </View>
            </View>
          </View>

          <View style={styles.identityStoryLine}>
            <Ionicons name="book-outline" size={15} color="#f4c451" />
            <Text style={styles.identityStoryText}>
              История складывается из реальных мест, пройденных дорог и заслуженных наград.
            </Text>
          </View>
        </View>

        <View style={styles.storySection}>
          <View style={styles.storyHeading}>
            <Text style={styles.storyEyebrow}>ИСТОРИЯ ИССЛЕДОВАТЕЛЯ</Text>
            <Text style={styles.storyHint}>Главное, что уже осталось на карте мира</Text>
          </View>

          <View style={styles.primaryStoryRow}>
            <StoryPrimaryMetric
              icon="trophy"
              value={stats.achievements || 0}
              label="Награды"
              detail="заслужено в пути"
              accent="#f4c451"
            />
            <StoryPrimaryMetric
              icon="compass"
              value={stats.territories || 0}
              label="Открытия"
              detail="территорий раскрыто"
              accent="#b7ee59"
            />
          </View>

          <View style={styles.secondaryStoryRow}>
            <StorySecondaryMetric
              icon="flame"
              value={`${formatNumber(stats.streakDays || 1)} дн.`}
              label="Серия"
              accent="#ff9a5b"
            />
            <StorySecondaryMetric
              icon="footsteps"
              value={formatNumber(stats.stepsCount || 0)}
              label="Шаги"
              accent="#d9f5a0"
            />
            <StorySecondaryMetric
              icon="star"
              value={formatNumber(stats.xp || 0)}
              label="XP"
              accent="#89c7ff"
              subdued
            />
          </View>
        </View>

        <Panel title="Награды и достижения" action={`${stats.achievements || 0}/${content.achievements.length}`}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementsRow}>
            {content.achievements.map((item) => {
              const unlocked = isRequirementMet(item, stats);
              const progress = requirementProgress(item, stats);
              return (
                <View key={item.id} style={[styles.achievementCard, unlocked && styles.achievementUnlocked]}>
                  <View style={[styles.achievementIconWrap, unlocked && styles.achievementIconUnlocked]}>
                    {unlocked && getContentImageSource(item) ? (
                      <ResilientImage source={getContentImageSource(item)} style={styles.achievementImage} resizeMode="contain" />
                    ) : (
                      <Text style={styles.achievementIcon}>{unlocked ? item.icon || "✦" : "🔒"}</Text>
                    )}
                  </View>
                  <Text numberOfLines={2} style={styles.achievementTitle}>{item.title}</Text>
                  <Text numberOfLines={2} style={styles.achievementText}>{item.description}</Text>
                  <View style={styles.achievementProgressRow}>
                    <Text style={styles.achievementProgressText}>
                      {unlocked ? "Получено" : `${formatMetric(progress.current)}/${formatMetric(progress.target)}`}
                    </Text>
                    <Text style={styles.achievementReward}>+{item.rewardXp || 0} XP</Text>
                  </View>
                  <ProgressBar progress={progress.percent} height={5} color={unlocked ? "#f4c451" : "#7ea349"} />
                </View>
              );
            })}
          </ScrollView>
        </Panel>

        <Panel title="Последние открытия" action={`${discoveries.length} в коллекции`}>
          {discoveries.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.discoveryRow}>
              {discoveries.map((item, index) => (
                <DiscoveryCard key={item.id || `${item.title}-${index}`} item={item} featured={index === 0} index={index} />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyDiscovery}>
              <View style={styles.emptyDiscoveryIcon}>
                <Ionicons name="compass-outline" size={24} color="#b8f55b" />
              </View>
              <View style={styles.emptyDiscoveryCopy}>
                <Text style={styles.emptyDiscoveryTitle}>Открытий пока нет</Text>
                <Text style={styles.emptyDiscoveryText}>Открой карту и пройди первые реальные метры.</Text>
              </View>
            </View>
          )}
        </Panel>

        <View style={styles.geographySection}>
          <TravelGeographyCard stats={stats} checkins={checkins} user={user} />
        </View>

        <Panel title="Коллекция фигурок" action={`${content.pawns.length} образов`}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pawnRow}>
            {content.pawns.map((pawn) => {
              const unlocked = isRequirementMet(pawn, stats);
              const selected = user?.selectedPawn === pawn.id || (!user?.selectedPawn && pawn.id === "pawn_green");
              const progress = requirementProgress(pawn, stats);
              return (
                <TouchableOpacity
                  key={pawn.id}
                  activeOpacity={0.86}
                  style={[
                    styles.pawnCard,
                    selected && { borderColor: rarityColor(pawn.rarity), backgroundColor: `${rarityColor(pawn.rarity)}17` },
                    !unlocked && styles.pawnLocked,
                  ]}
                  onPress={() => selectPawn(pawn)}
                >
                  <RarityAvatar
                    source={getPawnSource(pawn)}
                    fallbackSource={getLocalPawnFallback(pawn)}
                    rarity={pawn.rarity}
                    glowColor={pawn.glowColor}
                    size={91}
                    selected={selected}
                  />
                  {!unlocked ? (
                    <View style={styles.lockBubble}>
                      <Ionicons name="lock-closed" size={16} color="#e2e4e2" />
                    </View>
                  ) : null}
                  {selected ? (
                    <View style={styles.selectedDot}>
                      <Ionicons name="checkmark" size={14} color="#07140d" />
                    </View>
                  ) : null}
                  <Text numberOfLines={1} style={styles.pawnName}>{pawn.name}</Text>
                  <Text style={[styles.pawnRarity, { color: rarityColor(pawn.rarity) }]}>{rarityLabel(pawn.rarity)}</Text>
                  <Text numberOfLines={2} style={styles.pawnCondition}>
                    {selected ? "Используется" : unlocked ? "Нажми, чтобы выбрать" : pawn.condition}
                  </Text>
                  {!unlocked ? <ProgressBar progress={progress.percent} height={4} color={rarityColor(pawn.rarity)} /> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Panel>
      </ScrollView>

      <Modal
        visible={settingsVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <SettingsScreen
          initialUser={{ ...user, level: stats.level || user?.level || 1 }}
          pawns={content.pawns}
          onClose={() => setSettingsVisible(false)}
          onUserUpdated={(updated) => setUser(updated)}
          onLogout={onLogout}
        />
      </Modal>
    </View>
  );
}

function DiscoveryCard({ item, featured, index }) {
  return (
    <View style={[styles.discoveryCard, featured && styles.discoveryFeatured]}>
      <ResilientImage
        source={getContentImageSource(item) || discoveryBg}
        fallbackSource={discoveryBg}
        style={[
          styles.discoveryImage,
          featured && styles.discoveryImageFeatured,
          !getContentImageSource(item) && { transform: [{ translateX: -index * 13 }] },
        ]}
        resizeMode="cover"
      />
      <View style={styles.discoveryShade} />
      {featured ? <Text style={styles.lastLabel}>ПОСЛЕДНЕЕ ОТКРЫТИЕ</Text> : null}
      <View style={styles.discoveryPin}>
        <Text style={styles.discoverySymbol}>✦</Text>
      </View>
      <View style={styles.discoveryCopy}>
        <Text numberOfLines={1} style={styles.discoveryTitle}>{item.title || item.city}</Text>
        <Text numberOfLines={1} style={styles.discoveryPlace}>{item.country || "Мир"}</Text>
        <Text style={styles.discoveryXp}>+{item.xp || 20} XP</Text>
      </View>
    </View>
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

function StoryPrimaryMetric({ icon, value, label, detail, accent }) {
  return (
    <View style={[styles.storyPrimaryCard, { borderColor: `${accent}38` }]}>
      <View style={[styles.storyPrimaryIcon, { backgroundColor: `${accent}16` }]}>
        <Ionicons name={icon} size={22} color={accent} />
      </View>
      <View style={styles.storyPrimaryCopy}>
        <Text style={[styles.storyPrimaryValue, { color: accent }]}>{formatNumber(value)}</Text>
        <Text style={styles.storyPrimaryLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.storyPrimaryDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function StorySecondaryMetric({ icon, value, label, accent, subdued = false }) {
  return (
    <View style={[styles.storySecondaryCard, subdued && styles.storySecondarySubdued]}>
      <View style={[styles.storySecondaryIcon, { backgroundColor: `${accent}14` }]}>
        <Ionicons name={icon} size={17} color={accent} />
      </View>
      <Text numberOfLines={1} style={styles.storySecondaryValue}>{value}</Text>
      <Text style={styles.storySecondaryLabel}>{label}</Text>
    </View>
  );
}

function lastKnownPlace(checkins) {
  const item = checkins[checkins.length - 1];
  if (!item) return "Местоположение ещё не открыто";
  return `${item.title || item.city || "Мир"}, ${item.country || "Планета"}`;
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

function rarityLabel(rarity) {
  const labels = {
    common: "Обычная",
    uncommon: "Необычная",
    rare: "Редкая",
    epic: "Эпическая",
    legendary: "Легендарная",
    mythic: "Мифическая",
    shadow: "Теневая",
  };
  return labels[rarity] || "Обычная";
}

function formatDistance(value) {
  const number = Number(value || 0);
  if (number < 1) return `${Math.round(number * 1000)} м`;
  return `${number.toFixed(number >= 10 ? 0 : 1)} км`;
}

function formatMetric(value) {
  const number = Number(value || 0);
  if (Number.isInteger(number)) return formatNumber(number);
  return number.toFixed(1);
}

function formatNumber(value) {
  return String(Number(value || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#03100e",
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 122,
  },
  topRow: {
    minHeight: 69,
    paddingHorizontal: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageEyebrow: {
    color: "#b7ee59",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.7,
  },
  pageTitle: {
    marginTop: 4,
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  settingsButton: {
    width: 47,
    height: 47,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(4,25,24,0.90)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    overflow: "visible",
  },
  settingsGlow: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(169,236,86,0.08)",
    shadowColor: "#b7ee59",
    shadowOpacity: 0.42,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  heroCard: {
    minHeight: 226,
    padding: 16,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "rgba(4, 29, 25, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(169,236,86,0.17)",
    shadowColor: "#000",
    shadowOpacity: 0.42,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
  heroGlow: {
    position: "absolute",
    right: -55,
    top: -66,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "rgba(169,236,86,0.08)",
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarStage: {
    width: 126,
    height: 126,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(1, 17, 16, 0.64)",
    borderWidth: 1,
  },
  identityBody: {
    flex: 1,
    marginLeft: 13,
  },
  name: {
    color: "#fff",
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  explorerBadge: {
    marginTop: 7,
    alignSelf: "flex-start",
    minHeight: 28,
    paddingHorizontal: 9,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(169,236,86,0.10)",
  },
  titleLabel: {
    color: "#b9ed75",
    fontSize: 10,
    fontWeight: "900",
  },
  locationText: {
    marginTop: 8,
    color: "rgba(255,255,255,0.56)",
    fontSize: 10,
    fontWeight: "800",
  },
  rarityBadge: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rarityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  rarityText: {
    color: "rgba(255,255,255,0.42)",
    fontSize: 9,
    fontWeight: "800",
  },
  identityStoryLine: {
    marginTop: 16,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  identityStoryText: {
    flex: 1,
    color: "rgba(255,255,255,0.54)",
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
  },
  storySection: {
    marginTop: 13,
    padding: 13,
    borderRadius: 27,
    backgroundColor: "rgba(3, 23, 22, 0.93)",
    borderWidth: 1,
    borderColor: "rgba(244,196,81,0.13)",
  },
  storyHeading: {
    paddingHorizontal: 3,
    marginBottom: 11,
  },
  storyEyebrow: {
    color: "#f4c451",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  storyHint: {
    marginTop: 4,
    color: "rgba(255,255,255,0.43)",
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "700",
  },
  primaryStoryRow: {
    flexDirection: "row",
    gap: 9,
  },
  storyPrimaryCard: {
    flex: 1,
    minHeight: 116,
    padding: 12,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  storyPrimaryIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  storyPrimaryCopy: {
    flex: 1,
    marginLeft: 10,
  },
  storyPrimaryValue: {
    fontSize: 25,
    lineHeight: 28,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  storyPrimaryLabel: {
    marginTop: 2,
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  storyPrimaryDetail: {
    marginTop: 3,
    color: "rgba(255,255,255,0.38)",
    fontSize: 8,
    fontWeight: "700",
  },
  secondaryStoryRow: {
    marginTop: 9,
    flexDirection: "row",
    gap: 8,
  },
  storySecondaryCard: {
    flex: 1,
    minHeight: 92,
    paddingHorizontal: 6,
    paddingVertical: 10,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.036)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.065)",
  },
  storySecondarySubdued: {
    backgroundColor: "rgba(137,199,255,0.025)",
    borderColor: "rgba(137,199,255,0.08)",
  },
  storySecondaryIcon: {
    width: 31,
    height: 31,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  storySecondaryValue: {
    marginTop: 5,
    maxWidth: 105,
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  storySecondaryLabel: {
    marginTop: 2,
    color: "rgba(255,255,255,0.42)",
    fontSize: 8,
    fontWeight: "800",
  },
  geographySection: {
    paddingTop: 22,
  },
  panel: {
    paddingTop: 22,
  },
  panelHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 11,
  },
  panelTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  seeAll: {
    color: "#b7ee59",
    fontSize: 10,
    fontWeight: "800",
  },
  emptyDiscovery: {
    minHeight: 92,
    paddingHorizontal: 15,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(3,24,23,0.90)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  emptyDiscoveryIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(169,236,86,0.10)",
  },
  emptyDiscoveryCopy: {
    flex: 1,
    marginLeft: 12,
  },
  emptyDiscoveryTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  emptyDiscoveryText: {
    marginTop: 4,
    color: "rgba(255,255,255,0.48)",
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "700",
  },
  discoveryRow: {
    gap: 10,
    paddingRight: 12,
  },
  discoveryCard: {
    width: 153,
    height: 167,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "rgba(4,22,25,0.94)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  discoveryFeatured: {
    width: 226,
    borderColor: "rgba(244,196,81,0.28)",
  },
  discoveryImage: {
    position: "absolute",
    width: 220,
    height: 167,
    resizeMode: "cover",
  },
  discoveryImageFeatured: {
    width: 290,
  },
  discoveryShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,17,20,0.50)",
  },
  lastLabel: {
    position: "absolute",
    left: 11,
    top: 11,
    color: "#f4c451",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  discoveryPin: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(1,18,18,0.82)",
    borderWidth: 1,
    borderColor: "rgba(244,196,81,0.22)",
  },
  discoverySymbol: {
    color: "#f4c451",
    fontSize: 17,
  },
  discoveryCopy: {
    position: "absolute",
    left: 11,
    right: 11,
    bottom: 11,
  },
  discoveryTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  discoveryPlace: {
    marginTop: 4,
    color: "rgba(255,255,255,0.54)",
    fontSize: 10,
    fontWeight: "700",
  },
  discoveryXp: {
    marginTop: 5,
    color: "#b7ee59",
    fontSize: 11,
    fontWeight: "900",
  },
  achievementsRow: {
    gap: 10,
    paddingRight: 12,
  },
  achievementCard: {
    width: 151,
    minHeight: 205,
    borderRadius: 22,
    padding: 12,
    backgroundColor: "rgba(4,25,25,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  achievementUnlocked: {
    borderColor: "rgba(244,196,81,0.28)",
    backgroundColor: "rgba(57,43,12,0.72)",
  },
  achievementIconWrap: {
    alignSelf: "center",
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  achievementIconUnlocked: {
    backgroundColor: "rgba(244,196,81,0.11)",
    borderWidth: 1,
    borderColor: "rgba(244,196,81,0.20)",
  },
  achievementIcon: {
    fontSize: 27,
    textAlign: "center",
  },
  achievementImage: {
    width: 42,
    height: 42,
  },
  achievementTitle: {
    marginTop: 9,
    color: "#f3d18b",
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  achievementText: {
    marginTop: 5,
    minHeight: 29,
    color: "rgba(255,255,255,0.50)",
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  achievementProgressRow: {
    marginTop: "auto",
    marginBottom: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  achievementProgressText: {
    color: "rgba(255,255,255,0.44)",
    fontSize: 8,
    fontWeight: "800",
  },
  achievementReward: {
    color: "#f4c451",
    fontSize: 8,
    fontWeight: "900",
  },
  pawnRow: {
    gap: 10,
    paddingRight: 12,
  },
  pawnCard: {
    width: 158,
    minHeight: 225,
    borderRadius: 23,
    padding: 12,
    alignItems: "center",
    backgroundColor: "rgba(4,25,25,0.93)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  pawnLocked: {
    opacity: 0.58,
  },
  selectedDot: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 25,
    height: 25,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#b7ee59",
    zIndex: 3,
  },
  lockBubble: {
    position: "absolute",
    top: 40,
    width: 39,
    height: 39,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.62)",
    zIndex: 3,
  },
  pawnName: {
    marginTop: 10,
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  pawnRarity: {
    marginTop: 3,
    fontSize: 8,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  pawnCondition: {
    marginTop: 6,
    minHeight: 27,
    color: "rgba(255,255,255,0.45)",
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  pathPanel: {
    minHeight: 163,
    borderRadius: 24,
    padding: 13,
    backgroundColor: "rgba(4,25,25,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    gap: 12,
  },
  miniMap: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    padding: 12,
    justifyContent: "flex-end",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  mapGridOne: {
    position: "absolute",
    left: -25,
    right: -25,
    top: 42,
    height: 1,
    transform: [{ rotate: "19deg" }],
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  mapGridTwo: {
    position: "absolute",
    left: -25,
    right: -25,
    top: 76,
    height: 1,
    transform: [{ rotate: "-16deg" }],
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  greenBlobOne: {
    position: "absolute",
    left: 25,
    bottom: 49,
    width: 72,
    height: 36,
    borderRadius: 28,
    backgroundColor: "rgba(169,236,86,0.26)",
  },
  greenBlobTwo: {
    position: "absolute",
    right: 18,
    top: 28,
    width: 50,
    height: 28,
    borderRadius: 20,
    backgroundColor: "rgba(169,236,86,0.18)",
  },
  mapCaption: {
    marginTop: 7,
    color: "rgba(255,255,255,0.54)",
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "800",
  },
  flagsWrap: {
    flex: 1.08,
    justifyContent: "center",
  },
  flagsTitle: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 10,
  },
  flagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  flagBadge: {
    width: 38,
    height: 33,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  flagText: {
    fontSize: 20,
  },
  flagsMeta: {
    marginTop: 11,
    color: "#b7ee59",
    fontSize: 10,
    fontWeight: "800",
  },
  yerevanMeta: {
    marginTop: 4,
    color: "rgba(255,255,255,0.42)",
    fontSize: 9,
    fontWeight: "700",
  },
});
