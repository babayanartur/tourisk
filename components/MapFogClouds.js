import React, { useMemo } from "react";
import { Image, Platform, StyleSheet, View } from "react-native";
import { Marker } from "react-native-maps";
import { FogEngine } from "../src/maps/services/FogEngine";

const cloudTextures = [
  require("../assets/fog/map-cloud-night-a.png"),
  require("../assets/fog/map-cloud-night-b.png"),
  require("../assets/fog/map-cloud-night-c.png"),
];

// One marker contains a small cloud bank, not a single flat sprite. This keeps the
// map fully hidden while avoiding the hundreds of native markers that used to crash
// weaker Android devices.
const MAX_CLOUDS = Platform.OS === "android" ? 28 : 34;

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

  return clouds.map((cloud) => {
    const textureIndex = (Math.max(1, cloud.variant || 1) - 1) % cloudTextures.length;
    const wispTextureIndex = (textureIndex + 1) % cloudTextures.length;

    return (
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
          renderToHardwareTextureAndroid
          style={[
            styles.cloudBank,
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
            source={cloudTextures[textureIndex]}
            resizeMode="stretch"
            style={styles.mainCloud}
          />
          <Image
            fadeDuration={0}
            source={cloudTextures[wispTextureIndex]}
            resizeMode="stretch"
            style={[
              styles.wispCloud,
              {
                left: cloud.flip ? "-10%" : "12%",
                transform: [
                  { rotate: `${cloud.flip ? -9 : 8}deg` },
                  { scaleX: cloud.flip ? -1 : 1 },
                ],
              },
            ]}
          />
          <View style={styles.cloudShade} />
        </View>
      </Marker>
    );
  });
}

export default React.memo(MapFogClouds);

const styles = StyleSheet.create({
  cloudBank: {
    alignItems: "center",
    justifyContent: "center",
  },
  mainCloud: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  wispCloud: {
    position: "absolute",
    top: "13%",
    width: "88%",
    height: "77%",
    opacity: 0.66,
  },
  cloudShade: {
    position: "absolute",
    left: "8%",
    right: "8%",
    bottom: "11%",
    height: "30%",
    borderRadius: 999,
    backgroundColor: "rgba(0, 8, 13, 0.22)",
    shadowColor: "#02090d",
    shadowOpacity: 0.58,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
  },
});
