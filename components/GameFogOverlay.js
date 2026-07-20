import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Image as SvgImage,
  LinearGradient,
  Mask,
  Polyline,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

import { FogEngine } from "../src/maps/services/FogEngine";

const cloudTextures = [
  require("../assets/fog/game-cloud-1.png"),
  require("../assets/fog/game-cloud-2.png"),
  require("../assets/fog/game-cloud-3.png"),
  require("../assets/fog/game-cloud-4.png"),
  require("../assets/fog/game-cloud-5.png"),
  require("../assets/fog/game-cloud-6.png"),
];

const MAX_REVEAL_POINTS = 240;
const MAX_TRAIL_POINTS = 180;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hash(value) {
  const x = Math.sin(Number(value) * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function regionContains(region, point, margin = 2) {
  const latDelta = Math.max(0.004, Number(region?.latitudeDelta || 0.03));
  const lngDelta = Math.max(0.004, Number(region?.longitudeDelta || 0.03));
  return (
    Math.abs(Number(point.latitude) - Number(region.latitude)) <= latDelta * margin &&
    Math.abs(Number(point.longitude) - Number(region.longitude)) <= lngDelta * margin
  );
}

function dedupePoints(points, minimumDistanceMeters = 16) {
  const selected = [];
  for (const point of points) {
    if (!point || !Number.isFinite(Number(point.latitude)) || !Number.isFinite(Number(point.longitude))) continue;
    const normalized = {
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
      timestamp: Number(point.timestamp || 0),
      current: Boolean(point.current),
    };
    const duplicate = selected.some((existing) => FogEngine.distanceMeters(existing, normalized) < minimumDistanceMeters);
    if (!duplicate) selected.push(normalized);
  }
  return selected;
}

function interpolateSegment(start, end, spacingMeters) {
  const distance = FogEngine.distanceMeters(start, end);
  if (!Number.isFinite(distance) || distance <= spacingMeters) return [];
  const count = Math.min(28, Math.floor(distance / spacingMeters));
  const points = [];
  for (let index = 1; index < count; index += 1) {
    const ratio = index / count;
    points.push({
      latitude: start.latitude + (end.latitude - start.latitude) * ratio,
      longitude: start.longitude + (end.longitude - start.longitude) * ratio,
      timestamp: Math.max(Number(start.timestamp || 0), Number(end.timestamp || 0)),
    });
  }
  return points;
}

function buildRevealModel(region, visitedCells, liveTrail, currentLocation, revealRadiusMeters) {
  const visited = [];
  for (let index = Math.max(0, visitedCells.length - 900); index < visitedCells.length; index += 1) {
    const center = FogEngine.cellCenter(visitedCells[index]);
    if (center && regionContains(region, center, 2.15)) visited.push(center);
  }

  const trail = (liveTrail || [])
    .filter((point) => regionContains(region, point, 2.15))
    .slice(-160)
    .map((point) => ({
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
      timestamp: Number(point.timestamp || 0),
    }));

  const connectedTrail = [];
  const spacingMeters = Math.max(10, revealRadiusMeters * 0.15);
  for (let index = 0; index < trail.length; index += 1) {
    const point = trail[index];
    if (index > 0) connectedTrail.push(...interpolateSegment(trail[index - 1], point, spacingMeters));
    connectedTrail.push(point);
  }

  const current = currentLocation
    ? [{
        latitude: Number(currentLocation.latitude),
        longitude: Number(currentLocation.longitude),
        timestamp: Date.now(),
        current: true,
      }]
    : [];

  const revealPoints = dedupePoints(
    [...visited, ...connectedTrail, ...current],
    Math.max(10, revealRadiusMeters * 0.10)
  ).slice(-MAX_REVEAL_POINTS);

  const trailPoints = dedupePoints(
    [...connectedTrail, ...current],
    Math.max(8, revealRadiusMeters * 0.08)
  ).slice(-MAX_TRAIL_POINTS);

  return { revealPoints, trailPoints };
}

function coordinateToScreen(point, region, width, height) {
  const latDelta = Math.max(0.004, Number(region.latitudeDelta || 0.03));
  const lngDelta = Math.max(0.004, Number(region.longitudeDelta || 0.03));
  return {
    x: width * (0.5 + (Number(point.longitude) - Number(region.longitude)) / lngDelta),
    y: height * (0.5 - (Number(point.latitude) - Number(region.latitude)) / latDelta),
  };
}

function buildCloudBanks(region, revealPoints, revealRadiusMeters, width, height) {
  if (!region || !revealPoints.length) return [];

  const latitude = Number(region.latitude || 0);
  const latMeters = Math.max(120, Number(region.latitudeDelta || 0.03) * 111320);
  const lngMeters = Math.max(
    120,
    Number(region.longitudeDelta || 0.03) * 111320 * Math.cos((latitude * Math.PI) / 180)
  );
  const metersPerPixel = Math.max(0.5, Math.sqrt((latMeters / height) * (lngMeters / width)));
  const centerMercator = FogEngine.toMercator(region.latitude, region.longitude);
  const halfWidthMeters = lngMeters / 2;
  const halfHeightMeters = latMeters / 2;
  const minX = centerMercator.x - halfWidthMeters * 1.32;
  const maxX = centerMercator.x + halfWidthMeters * 1.32;
  const minY = centerMercator.y - halfHeightMeters * 1.32;
  const maxY = centerMercator.y + halfHeightMeters * 1.32;

  const spacing = clamp(Math.min(latMeters, lngMeters) * 0.16, 85, 250);
  const rowStep = spacing * 0.78;
  const colStep = spacing * 0.84;
  const clouds = [];
  let rowIndex = 0;

  for (let y = minY; y <= maxY; y += rowStep) {
    let colIndex = 0;
    for (let x = minX; x <= maxX; x += colStep) {
      const seed = Math.round((x + y) * 0.001) + rowIndex * 131 + colIndex * 17;
      const staggerX = rowIndex % 2 === 0 ? 0 : colStep * 0.36;
      const center = FogEngine.fromMercator(
        x + staggerX + (hash(seed + 7) - 0.5) * colStep * 0.44,
        y + (hash(seed + 13) - 0.5) * rowStep * 0.38
      );

      if (!regionContains(region, center, 2.15)) {
        colIndex += 1;
        continue;
      }

      let nearestReveal = Infinity;
      for (const reveal of revealPoints) {
        const distance = FogEngine.distanceMeters(center, reveal);
        if (distance < nearestReveal) nearestReveal = distance;
        if (nearestReveal < revealRadiusMeters * 1.22 + spacing * 1.2) break;
      }
      if (nearestReveal < revealRadiusMeters * 1.22 + spacing * 1.2) {
        colIndex += 1;
        continue;
      }

      const bankWidthMeters = spacing * (1.8 + hash(seed + 19) * 1.3);
      const bankHeightMeters = bankWidthMeters * (0.48 + hash(seed + 23) * 0.18);
      const depth = hash(seed + 29) > 0.56 ? "front" : "back";
      clouds.push({
        id: `cloud-${rowIndex}-${colIndex}`,
        texture: cloudTextures[(rowIndex + colIndex) % cloudTextures.length],
        center,
        width: clamp(bankWidthMeters / metersPerPixel, 72, width * 0.40),
        height: clamp(bankHeightMeters / metersPerPixel, 42, height * 0.18),
        opacity: depth === "front"
          ? 0.44 + hash(seed + 31) * 0.16
          : 0.24 + hash(seed + 37) * 0.12,
        rotation: (hash(seed + 41) - 0.5) * 18,
        depth,
      });
      colIndex += 1;
    }
    rowIndex += 1;
  }

  return clouds.sort((a, b) => (a.depth === b.depth ? 0 : a.depth === "back" ? -1 : 1));
}

function GameFogOverlay({
  region,
  visitedCells = [],
  liveTrail = [],
  currentLocation = null,
  revealRadiusMeters = 105,
}) {
  const { width, height } = useWindowDimensions();
  const breathing = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(breathing, {
          toValue: 1,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathing, {
          toValue: 0,
          duration: 5600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [breathing]);

  const { revealPoints, trailPoints } = useMemo(
    () => buildRevealModel(region, visitedCells, liveTrail, currentLocation, revealRadiusMeters),
    [currentLocation, liveTrail, region, revealRadiusMeters, visitedCells]
  );

  const geometry = useMemo(() => {
    if (!region || width <= 0 || height <= 0) {
      return { circles: [], trail: [], baseRadius: 60, clouds: [] };
    }

    const latitudeMeters = Math.max(1, Number(region.latitudeDelta || 0.03) * 111320);
    const longitudeMeters = Math.max(
      1,
      Number(region.longitudeDelta || 0.03) * 111320 * Math.cos((Number(region.latitude || 0) * Math.PI) / 180)
    );
    const metersPerPixel = Math.max(0.5, Math.sqrt((latitudeMeters / height) * (longitudeMeters / width)));
    const baseRadius = clamp((revealRadiusMeters / metersPerPixel) * 1.38, 18, 140);

    const circles = revealPoints.map((point, index) => {
      const screen = coordinateToScreen(point, region, width, height);
      const seed = Math.abs(
        Math.round(Number(point.latitude) * 100000) ^
        Math.round(Number(point.longitude) * 100000) ^
        (index * 92821)
      );
      const radius = baseRadius * (point.current ? 1.22 : 1) * (0.90 + hash(seed + 7) * 0.18);
      return {
        id: `circle-${seed}-${index}`,
        x: screen.x,
        y: screen.y,
        soft: radius * (1.26 + hash(seed + 13) * 0.12),
        core: radius * (0.92 + hash(seed + 19) * 0.08),
        dot: point.current ? radius * 0.34 : 0,
      };
    });

    const trail = trailPoints
      .map((point) => coordinateToScreen(point, region, width, height))
      .filter((point) => point.x > -width * 0.35 && point.x < width * 1.35 && point.y > -height * 0.35 && point.y < height * 1.35);

    const clouds = buildCloudBanks(region, revealPoints, revealRadiusMeters, width, height)
      .map((cloud) => {
        const screen = coordinateToScreen(cloud.center, region, width, height);
        return {
          ...cloud,
          x: screen.x - cloud.width / 2,
          y: screen.y - cloud.height / 2,
        };
      })
      .filter((cloud) => cloud.x < width + cloud.width && cloud.x > -cloud.width && cloud.y < height + cloud.height && cloud.y > -cloud.height);

    return { circles, trail, baseRadius, clouds };
  }, [height, region, revealPoints, revealRadiusMeters, trailPoints, width]);

  const animatedOpacity = breathing.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });
  const animatedScale = breathing.interpolate({ inputRange: [0, 1], outputRange: [1, 1.008] });

  if (!region || width <= 0 || height <= 0) return null;

  const trailAttr = geometry.trail.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.layer,
          {
            opacity: animatedOpacity,
            transform: [{ scale: animatedScale }],
          },
        ]}
      >
        <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <Mask id="tourisk-fog-mask" x="0" y="0" width={width} height={height} maskUnits="userSpaceOnUse">
              <Rect x="0" y="0" width={width} height={height} fill="#fff" />

              {geometry.trail.length >= 2 ? (
                <G>
                  <Polyline
                    points={trailAttr}
                    fill="none"
                    stroke="#000"
                    strokeOpacity="0.52"
                    strokeWidth={geometry.baseRadius * 1.55}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Polyline
                    points={trailAttr}
                    fill="none"
                    stroke="#000"
                    strokeOpacity="0.92"
                    strokeWidth={geometry.baseRadius * 0.96}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </G>
              ) : null}

              {geometry.circles.map((circle) => (
                <G key={circle.id}>
                  <Circle cx={circle.x} cy={circle.y} r={circle.soft} fill="url(#cutout-soft)" />
                  <Circle cx={circle.x} cy={circle.y} r={circle.core} fill="url(#cutout-core)" />
                  {circle.dot ? <Circle cx={circle.x} cy={circle.y} r={circle.dot} fill="url(#cutout-core)" /> : null}
                </G>
              ))}
            </Mask>

            <RadialGradient id="cutout-core" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#000" stopOpacity="0.92" />
              <Stop offset="68%" stopColor="#000" stopOpacity="0.88" />
              <Stop offset="90%" stopColor="#000" stopOpacity="0.42" />
              <Stop offset="100%" stopColor="#000" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="cutout-soft" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#000" stopOpacity="0.40" />
              <Stop offset="72%" stopColor="#000" stopOpacity="0.16" />
              <Stop offset="100%" stopColor="#000" stopOpacity="0" />
            </RadialGradient>
            <LinearGradient id="night-fog-base" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#08131c" stopOpacity="0.84" />
              <Stop offset="50%" stopColor="#07131a" stopOpacity="0.79" />
              <Stop offset="100%" stopColor="#02070c" stopOpacity="0.87" />
            </LinearGradient>
            <RadialGradient id="fog-vignette" cx="50%" cy="50%" rx="80%" ry="80%">
              <Stop offset="0%" stopColor="#000814" stopOpacity="0.03" />
              <Stop offset="74%" stopColor="#01050b" stopOpacity="0.12" />
              <Stop offset="100%" stopColor="#01040a" stopOpacity="0.32" />
            </RadialGradient>
          </Defs>

          <G mask="url(#tourisk-fog-mask)">
            <Rect x="0" y="0" width={width} height={height} fill="url(#night-fog-base)" />
            {geometry.clouds.map((cloud) => (
              <SvgImage
                key={cloud.id}
                href={cloud.texture}
                x={cloud.x}
                y={cloud.y}
                width={cloud.width}
                height={cloud.height}
                opacity={cloud.opacity}
                preserveAspectRatio="xMidYMid meet"
                rotation={cloud.rotation}
                origin={`${cloud.x + cloud.width / 2}, ${cloud.y + cloud.height / 2}`}
              />
            ))}
            <Rect x="0" y="0" width={width} height={height} fill="url(#fog-vignette)" />
          </G>
          <Rect x="0" y="0" width={width} height={height} fill="#031018" opacity="0.10" />
        </Svg>
      </Animated.View>
    </View>
  );
}

export default React.memo(GameFogOverlay);

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
});
