import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ImageBackground,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getContentImageSource } from "../services/assetResolver";

const fogOne = require("../assets/fog/fog_day_01.png");
const fogTwo = require("../assets/fog/fog_day_02.png");
const awakeningSound = require("../assets/sounds/legendary-awakening.wav");

export default function LegendaryDiscoveryCard({ place, onClose }) {
  const insets = useSafeAreaInsets();
  const entrance = useRef(new Animated.Value(0)).current;
  const atmosphere = useRef(new Animated.Value(0)).current;
  const fogDrift = useRef(new Animated.Value(0)).current;
  const soundRef = useRef(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!place) return undefined;
    setClosing(false);
    entrance.setValue(0);
    atmosphere.setValue(0);
    fogDrift.setValue(0);

    const entranceAnimation = Animated.timing(entrance, {
      toValue: 1,
      duration: 1250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    const atmosphereAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(atmosphere, {
          toValue: 1,
          duration: 5400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(atmosphere, {
          toValue: 0,
          duration: 5400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const fogAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(fogDrift, {
          toValue: 1,
          duration: 14500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(fogDrift, {
          toValue: 0,
          duration: 14500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    entranceAnimation.start();
    atmosphereAnimation.start();
    fogAnimation.start();

    let cancelled = false;
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    })
      .then(() => Audio.Sound.createAsync(awakeningSound, {
        shouldPlay: true,
        volume: 0.075,
        isLooping: false,
      }))
      .then(({ sound }) => {
        if (cancelled) {
          sound.unloadAsync().catch(() => {});
          return;
        }
        soundRef.current = sound;
      })
      .catch((error) => console.log("Discovery atmosphere sound skipped:", error?.message));

    return () => {
      cancelled = true;
      entranceAnimation.stop();
      atmosphereAnimation.stop();
      fogAnimation.stop();
      const sound = soundRef.current;
      soundRef.current = null;
      sound?.stopAsync().catch(() => {}).finally(() => sound?.unloadAsync().catch(() => {}));
    };
  }, [atmosphere, entrance, fogDrift, place]);

  if (!place) return null;

  const imageScale = entrance.interpolate({ inputRange: [0, 1], outputRange: [1.12, 1.02] });
  const cardTranslate = entrance.interpolate({ inputRange: [0, 1], outputRange: [34, 0] });
  const lightOpacity = atmosphere.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.34] });
  const lightScale = atmosphere.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.12] });
  const fogX = fogDrift.interpolate({ inputRange: [0, 1], outputRange: [-85, 65] });
  const fogXReverse = fogDrift.interpolate({ inputRange: [0, 1], outputRange: [55, -95] });
  const revisiting = Boolean(place.revisiting);

  const close = () => {
    if (closing) return;
    setClosing(true);
    Animated.timing(entrance, {
      toValue: 0,
      duration: 720,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onClose?.());
  };

  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={close}>
      <View style={styles.modalRoot}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: entrance, transform: [{ scale: imageScale }] }]}> 
          <ImageBackground
            source={getContentImageSource(place)}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          >
            <View style={styles.imageShade} />
            <View style={styles.warmWash} />
          </ImageBackground>
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.awakeningLight,
            { opacity: lightOpacity, transform: [{ scale: lightScale }] },
          ]}
        />
        <Animated.Image
          pointerEvents="none"
          source={fogOne}
          style={[styles.fog, styles.fogTop, { transform: [{ translateX: fogX }] }]}
          resizeMode="cover"
        />
        <Animated.Image
          pointerEvents="none"
          source={fogTwo}
          style={[styles.fog, styles.fogBottom, { transform: [{ translateX: fogXReverse }, { rotate: "180deg" }] }]}
          resizeMode="cover"
        />

        <Animated.View
          style={[
            styles.content,
            {
              paddingTop: insets.top + 14,
              paddingBottom: Math.max(insets.bottom + 26, 34),
              opacity: entrance,
              transform: [{ translateY: cardTranslate }],
            },
          ]}
        >
          <View style={styles.topRow}>
            <View style={styles.legendaryBadge}>
              <Text style={styles.legendaryStar}>✦</Text>
              <Text style={styles.legendaryBadgeText}>{revisiting ? "ЧАСТЬ ТВОЕЙ ИСТОРИИ" : "ЛЕГЕНДАРНОЕ ОТКРЫТИЕ"}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Закрыть карточку" onPress={close} style={styles.closeButton}>
              <Ionicons name="close" size={21} color="#fffbe8" />
            </Pressable>
          </View>

          <View style={styles.spacer} />

          <View style={styles.storyCard}>
            <View style={styles.placeIdentity}>
              <View style={styles.placeIconWrap}>
                <Text style={styles.placeIcon}>{place.icon || "✦"}</Text>
              </View>
              <View style={styles.placeIdentityCopy}>
                <Text style={styles.placeCity}>{place.city || "Ереван"} · {place.country || "Армения"}</Text>
                <Text style={styles.placeName}>{place.name}</Text>
              </View>
            </View>

            <View style={styles.goldRule}>
              <View style={styles.goldLine} />
              <Text style={styles.goldDiamond}>◇</Text>
              <View style={styles.goldLine} />
            </View>

            <Text style={styles.story}>{place.story || place.description || "Это место стало частью твоего пути."}</Text>

            <View style={styles.rewardRow}>
              <View style={styles.rewardChip}>
                <Ionicons name={revisiting ? "bookmark" : "sparkles"} size={17} color="#ffe5a1" />
                <Text style={styles.rewardText}>{revisiting ? "Сохранено" : `+${place.xp || 50} XP`}</Text>
              </View>
              <Text style={styles.rewardMeta}>{revisiting ? "Открыто ранее" : "Награда начисляется один раз"}</Text>
            </View>

            <Pressable accessibilityRole="button" onPress={close} style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}>
              <Text style={styles.actionButtonText}>{revisiting ? "Вернуться к карте" : "Сохранить в истории"}</Text>
              <Ionicons name="arrow-forward" size={20} color="#102014" />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#07110f",
  },
  imageShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 10, 12, 0.24)",
  },
  warmWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(109, 68, 22, 0.08)",
  },
  awakeningLight: {
    position: "absolute",
    left: "13%",
    top: "18%",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255, 216, 121, 0.46)",
    shadowColor: "#ffd879",
    shadowOpacity: 0.78,
    shadowRadius: 70,
    shadowOffset: { width: 0, height: 0 },
  },
  fog: {
    position: "absolute",
    left: -120,
    width: "160%",
    height: 280,
    opacity: 0.22,
  },
  fogTop: {
    top: 48,
  },
  fogBottom: {
    bottom: 80,
    opacity: 0.32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  legendaryBadge: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 19,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(5, 20, 18, 0.70)",
    borderWidth: 1,
    borderColor: "rgba(255, 218, 122, 0.38)",
  },
  legendaryStar: {
    color: "#f7d276",
    fontSize: 18,
    textShadowColor: "#f7d276",
    textShadowRadius: 12,
  },
  legendaryBadgeText: {
    marginLeft: 8,
    color: "#fff5d5",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.45,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(4, 18, 17, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  spacer: {
    flex: 1,
  },
  storyCard: {
    padding: 20,
    borderRadius: 30,
    backgroundColor: "rgba(3, 18, 17, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(250, 215, 126, 0.34)",
    shadowColor: "#000",
    shadowOpacity: 0.55,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
  },
  placeIdentity: {
    flexDirection: "row",
    alignItems: "center",
  },
  placeIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(247, 210, 118, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(247, 210, 118, 0.28)",
  },
  placeIcon: {
    fontSize: 29,
  },
  placeIdentityCopy: {
    flex: 1,
    marginLeft: 14,
  },
  placeCity: {
    color: "rgba(255, 243, 212, 0.58)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  placeName: {
    marginTop: 4,
    color: "#fffdf4",
    fontSize: 27,
    lineHeight: 31,
    fontWeight: "900",
  },
  goldRule: {
    marginVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  goldLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(247, 210, 118, 0.28)",
  },
  goldDiamond: {
    color: "#f7d276",
    fontSize: 14,
  },
  story: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "600",
  },
  rewardRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  rewardChip: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(247, 210, 118, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(247, 210, 118, 0.23)",
  },
  rewardText: {
    marginLeft: 7,
    color: "#ffe5a1",
    fontSize: 13,
    fontWeight: "900",
  },
  rewardMeta: {
    flex: 1,
    color: "rgba(255,255,255,0.38)",
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "700",
    textAlign: "right",
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
    shadowColor: "#e5ff9d",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  actionButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  actionButtonText: {
    color: "#102014",
    fontSize: 15,
    fontWeight: "900",
  },
});
