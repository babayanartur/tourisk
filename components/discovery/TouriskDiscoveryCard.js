import React, { useEffect, useRef } from "react";
import {
  Animated,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from "react-native";

const DISPLAY_TIME = 10000;
const SHOW_DURATION = 700;
const HIDE_DURATION = 650;

export default function TouriskDiscoveryCard({
  visible,
  discovery,
  onHide,
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const scale = useRef(new Animated.Value(0.975)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || !discovery) {
      return;
    }

    opacity.setValue(0);
    translateY.setValue(18);
    scale.setValue(0.975);

    const showAnimation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: SHOW_DURATION,
        useNativeDriver: true,
      }),

      Animated.timing(translateY, {
        toValue: 0,
        duration: SHOW_DURATION,
        useNativeDriver: true,
      }),

      Animated.timing(scale, {
        toValue: 1,
        duration: SHOW_DURATION,
        useNativeDriver: true,
      }),
    ]);

    const hideAnimation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: HIDE_DURATION,
        useNativeDriver: true,
      }),

      Animated.timing(translateY, {
        toValue: -8,
        duration: HIDE_DURATION,
        useNativeDriver: true,
      }),

      Animated.timing(scale, {
        toValue: 0.985,
        duration: HIDE_DURATION,
        useNativeDriver: true,
      }),
    ]);

    showAnimation.start();
    const glowAnimation = Animated.loop(
  Animated.sequence([
    Animated.timing(glowPulse, {
      toValue: 1,
      duration: 1800,
      useNativeDriver: true,
    }),

    Animated.timing(glowPulse, {
      toValue: 0,
      duration: 1800,
      useNativeDriver: true,
    }),
  ])
);

glowAnimation.start();

    const timer = setTimeout(() => {
      hideAnimation.start(({ finished }) => {
        if (finished) {
          onHide?.();
        }
      });
    }, DISPLAY_TIME);

    return () => {
      clearTimeout(timer);

            glowAnimation.stop();

      opacity.stopAnimation();
      translateY.stopAnimation();
      scale.stopAnimation();
    glowPulse.stopAnimation();
    };
  }, [
    visible,
    discovery,
    onHide,
    opacity,
    translateY,
    scale,
  ]);
const pawnGlowScale = glowPulse.interpolate({
  inputRange: [0, 1],
  outputRange: [0.92, 1.12],
});

const pawnGlowOpacity = glowPulse.interpolate({
  inputRange: [0, 1],
  outputRange: [0.28, 0.72],
});

  if (!visible || !discovery) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.card,
          {
            opacity,
            transform: [
              { translateY },
              { scale },
            ],
          },
        ]}
      >
        <View style={styles.cardGlow} />
        <View style={styles.fogLeft} />
        <View style={styles.fogRight} />

        <View style={styles.artFrame}>
          <ImageBackground
            source={discovery.image}
            resizeMode="cover"
            style={styles.art}
            imageStyle={styles.artImage}
          >
            <View style={styles.artShade} />
            <View style={styles.artFog} />

            <View style={styles.artHeader}>
              <View style={styles.rarityRow}>
                <View style={styles.rarityDot} />

                <Text style={styles.rarityText}>
                  {discovery.rarityLabel}
                </Text>
              </View>

              <Text style={styles.xpText}>
                +{discovery.xp} XP
              </Text>
            </View>
          </ImageBackground>
        </View>

        <View style={styles.body}>
          <View style={styles.mainRow}>
            <View style={styles.pawnContainer}>
              <View style={styles.orbitLarge} />
              <View style={styles.orbitSmall} />
<Animated.View
  style={[
    styles.pawnGlow,
    {
      opacity: pawnGlowOpacity,
      transform: [{ scale: pawnGlowScale }],
    },
  ]}
/>
              <Text style={styles.pawn}>
                ♟
              </Text>

              <View style={styles.sparkOne} />
              <View style={styles.sparkTwo} />
            </View>

            <View style={styles.textContent}>
              <Text style={styles.worldLabel}>
                ТВОЙ МИР СТАЛ БОЛЬШЕ
              </Text>

              <Text
                numberOfLines={1}
                style={styles.title}
              >
                {discovery.title}
              </Text>

              <Text
                numberOfLines={3}
                style={styles.description}
              >
                {discovery.description}
              </Text>
            </View>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerDot} />
            <View style={styles.dividerLineBright} />
            <View style={styles.dividerDiamond} />
            <View style={styles.dividerLineMuted} />
          </View>

          <View style={styles.footer}>
            <View style={styles.collectionIcon}>
              <Text style={styles.collectionPawn}>
                ♟
              </Text>
            </View>

            <View style={styles.collectionContent}>
              <Text style={styles.collectionLabel}>
                ДОБАВЛЕНО В КОЛЛЕКЦИЮ {discovery.city.toUpperCase()}
              </Text>

              <Text style={styles.collectionName}>
                {discovery.collectionName}
              </Text>
            </View>

            <View style={styles.progressBox}>
              <Text style={styles.progressCurrent}>
                {discovery.collectionCurrent}
              </Text>

              <Text style={styles.progressTotal}>
                / {discovery.collectionTotal}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 92,

    zIndex: 5000,
    elevation: 40,
  },

  card: {
    position: "relative",
    overflow: "hidden",

    borderRadius: 28,

    backgroundColor: "rgba(5, 13, 13, 0.985)",

    borderWidth: 1.3,
    borderColor: "rgba(201, 216, 128, 0.48)",

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.62,
    shadowRadius: 30,

    elevation: 30,
  },

  cardGlow: {
    position: "absolute",
    top: -100,
    left: 40,
    right: 40,

    height: 170,

    borderRadius: 90,

    backgroundColor: "rgba(197, 241, 92, 0.055)",
  },

  fogLeft: {
    position: "absolute",
    left: -75,
    bottom: -70,

    width: 230,
    height: 190,

    borderRadius: 115,

    backgroundColor: "rgba(68, 121, 96, 0.085)",
  },

  fogRight: {
    position: "absolute",
    right: -70,
    bottom: -80,

    width: 220,
    height: 180,

    borderRadius: 110,

    backgroundColor: "rgba(184, 222, 82, 0.035)",
  },

  artFrame: {
    height: 154,

    margin: 8,
    marginBottom: 0,

    overflow: "hidden",

    borderRadius: 21,

    borderWidth: 1,
    borderColor: "rgba(210, 225, 151, 0.28)",
  },

  art: {
    flex: 1,
  },

  artImage: {
    borderRadius: 21,
  },

  artShade: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor: "rgba(2, 8, 9, 0.12)",
  },

  artFog: {
    position: "absolute",
    left: -25,
    right: -25,
    bottom: -34,

    height: 85,

    borderRadius: 50,

    backgroundColor: "rgba(6, 16, 15, 0.31)",
  },

  artHeader: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rarityRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  rarityDot: {
    width: 7,
    height: 7,

    marginRight: 9,

    borderRadius: 4,

    backgroundColor: "#D9FF86",

    shadowColor: "#D9FF86",
    shadowOpacity: 1,
    shadowRadius: 8,
  },

  rarityText: {
    color: "rgba(238, 244, 201, 0.94)",

    fontSize: 8.5,
    fontWeight: "800",

    letterSpacing: 2.2,
  },

  xpText: {
    color: "#CFFF70",

    fontSize: 15,
    fontWeight: "900",

    letterSpacing: 0.5,

    textShadowColor: "rgba(207, 255, 112, 0.5)",
    textShadowRadius: 8,
  },

  body: {
    paddingHorizontal: 18,
    paddingTop: 15,
    paddingBottom: 15,
  },

  mainRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  pawnContainer: {
    position: "relative",

    width: 78,
    height: 78,

    marginRight: 16,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 39,

    backgroundColor: "rgba(128, 182, 51, 0.055)",

    borderWidth: 1,
    borderColor: "rgba(203, 242, 120, 0.27)",
  },

  orbitLarge: {
    position: "absolute",

    width: 70,
    height: 70,

    borderRadius: 35,

    borderWidth: 1,
    borderColor: "rgba(201, 241, 116, 0.18)",
  },

  orbitSmall: {
    position: "absolute",

    width: 52,
    height: 52,

    borderRadius: 26,

    borderWidth: 1,
    borderColor: "rgba(201, 241, 116, 0.13)",
  },

  pawnGlow: {
    position: "absolute",

    width: 43,
    height: 43,

    borderRadius: 22,

    backgroundColor: "rgba(204, 255, 105, 0.14)",

    shadowColor: "#CEFF70",
    shadowOpacity: 0.75,
    shadowRadius: 14,
  },

  pawn: {
    color: "#E3F6BC",

    fontSize: 39,

    textShadowColor: "rgba(207, 255, 112, 0.7)",
    textShadowRadius: 12,
  },

  sparkOne: {
    position: "absolute",
    top: 11,
    right: 12,

    width: 4,
    height: 4,

    borderRadius: 2,

    backgroundColor: "#D9FF86",
  },

  sparkTwo: {
    position: "absolute",
    left: 11,
    bottom: 14,

    width: 3,
    height: 3,

    borderRadius: 2,

    backgroundColor: "rgba(217, 255, 134, 0.72)",
  },

  textContent: {
    flex: 1,
  },

  worldLabel: {
    marginBottom: 4,

    color: "rgba(177, 207, 101, 0.75)",

    fontSize: 8.5,
    fontWeight: "800",

    letterSpacing: 1.9,
  },

  title: {
    color: "#F2EFDA",

    fontSize: 29,
    lineHeight: 33,

    fontWeight: "900",

    letterSpacing: -0.7,
  },

  description: {
    marginTop: 5,

    color: "rgba(225, 227, 210, 0.63)",

    fontSize: 11.5,
    lineHeight: 16.5,
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",

    marginTop: 16,
    marginBottom: 13,
  },

  dividerDot: {
    width: 5,
    height: 5,

    borderRadius: 3,

    backgroundColor: "rgba(207, 255, 112, 0.8)",
  },

  dividerLineBright: {
    flex: 1,
    height: 1,

    marginLeft: 5,

    backgroundColor: "rgba(207, 255, 112, 0.4)",
  },

  dividerDiamond: {
    width: 8,
    height: 8,

    marginHorizontal: 7,

    backgroundColor: "#CEFF70",

    transform: [
      { rotate: "45deg" },
    ],

    shadowColor: "#CEFF70",
    shadowOpacity: 0.85,
    shadowRadius: 7,
  },

  dividerLineMuted: {
    flex: 0.76,
    height: 1,

    backgroundColor: "rgba(255, 255, 255, 0.11)",
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
  },

  collectionIcon: {
    width: 43,
    height: 43,

    marginRight: 11,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 13,

    backgroundColor: "rgba(148, 199, 61, 0.045)",

    borderWidth: 1,
    borderColor: "rgba(199, 232, 108, 0.16)",
  },

  collectionPawn: {
    color: "rgba(215, 244, 139, 0.75)",

    fontSize: 22,

    textShadowColor: "rgba(206, 255, 112, 0.4)",
    textShadowRadius: 7,
  },

  collectionContent: {
    flex: 1,
    paddingRight: 10,
  },

  collectionLabel: {
    color: "rgba(164, 192, 92, 0.72)",

    fontSize: 7.5,
    fontWeight: "800",

    letterSpacing: 1.25,
  },

  collectionName: {
    marginTop: 4,

    color: "rgba(235, 235, 219, 0.67)",

    fontSize: 11.5,
    fontWeight: "600",
  },

  progressBox: {
    minWidth: 78,

    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",

    paddingHorizontal: 13,
    paddingVertical: 10,

    borderRadius: 18,

    backgroundColor: "rgba(8, 17, 15, 0.76)",

    borderWidth: 1,
    borderColor: "rgba(192, 226, 102, 0.17)",
  },

  progressCurrent: {
    color: "#CFFF70",

    fontSize: 23,
    fontWeight: "900",

    textShadowColor: "rgba(207, 255, 112, 0.45)",
    textShadowRadius: 8,
  },

  progressTotal: {
    marginLeft: 5,

    color: "rgba(236, 237, 219, 0.43)",

    fontSize: 12,
    fontWeight: "700",
  },
});