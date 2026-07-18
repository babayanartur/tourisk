import React, { useMemo } from "react";
import { Image, Platform, StyleSheet, View } from "react-native";
import { Marker } from "react-native-maps";
import { FogEngine } from "../src/maps/services/FogEngine";

const cloudTextures = [
  require("../assets/fog/map-cloud-a.png"),
  require("../assets/fog/map-cloud-b.png"),
  require("../assets/fog/map-cloud-c.png"),
];

// Native map markers are deliberately capped. The textures are large enough to overlap,
// so the viewport looks fully clouded without spawning hundreds of GPU-backed views.
const MAX_CLOUDS = Platform.OS === "android" ? 30 : 38;

function MapFogClouds({
  region,
  visitedCells = [],
  revealRadiusMeters = 105,
  currentLocation = null,
}) {
  const clouds = useMemo(
    () => FogEngine.getFogCloudsForRegion(region, visitedCells, {
      revealRadiusMeters,
      maxClouds: MAX_CLOUDS,
      currentLocation,
    }),
    [currentLocation, region, revealRadiusMeters, visitedCells]
  );

  return clouds.map((cloud) => (
    <Marker
      key={cloud.id}
      coordinate={cloud.center}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      zIndex={7200}
      tappable={false}
    >
      <View
        pointerEvents="none"
        collapsable={false}
        shouldRasterizeIOS
        style={[
          styles.cloudWrap,
          {
            width: cloud.width,
            height: cloud.height,
            opacity: cloud.opacity,
            transform: [
              { rotate: `${cloud.rotation || 0}deg` },
              { scaleX: cloud.flip ? -1 : 1 },
            ],
          },
        ]}
      >
        <Image
          fadeDuration={0}
          source={cloudTextures[(Math.max(1, cloud.variant || 1) - 1) % cloudTextures.length]}
          resizeMode="stretch"
          style={styles.cloudImage}
        />
      </View>
    </Marker>
  ));
}

export default React.memo(MapFogClouds);

const styles = StyleSheet.create({
  cloudWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  cloudImage: {
    width: "100%",
    height: "100%",
  },
});
