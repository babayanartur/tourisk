import React, { useMemo } from "react";
import { Overlay, Polygon } from "react-native-maps";

import { FogEngine } from "../src/maps/services/FogEngine";

const CLOUD_TEXTURES = [
  require("../assets/fog/game-cloud-1.png"),
  require("../assets/fog/game-cloud-2.png"),
  require("../assets/fog/game-cloud-3.png"),
  require("../assets/fog/game-cloud-4.png"),
  require("../assets/fog/game-cloud-5.png"),
  require("../assets/fog/game-cloud-6.png"),
];

const MAX_REVEAL_HOLES = 28;
const MAX_CLOUDS = 16;
const HOLE_SEGMENTS = 10;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hash(value) {
  const x = Math.sin(Number(value) * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function regionContains(region, point, margin = 2.4) {
  const latDelta = Math.max(0.004, Number(region?.latitudeDelta || 0.03));
  const lngDelta = Math.max(0.004, Number(region?.longitudeDelta || 0.03));
  return (
    Math.abs(Number(point.latitude) - Number(region.latitude)) <= latDelta * margin &&
    Math.abs(Number(point.longitude) - Number(region.longitude)) <= lngDelta * margin
  );
}

function dedupePoints(points, minimumDistanceMeters) {
  const result = [];
  for (const point of points) {
    if (!point || !Number.isFinite(Number(point.latitude)) || !Number.isFinite(Number(point.longitude))) continue;
    const normalized = {
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
      current: Boolean(point.current),
      priority: Number(point.priority || 0),
    };
    if (!result.some((existing) => FogEngine.distanceMeters(existing, normalized) < minimumDistanceMeters)) {
      result.push(normalized);
    }
  }
  return result;
}

function interpolateSegment(start, end, spacingMeters) {
  const distance = FogEngine.distanceMeters(start, end);
  if (!Number.isFinite(distance) || distance <= spacingMeters) return [];
  const count = Math.min(12, Math.floor(distance / spacingMeters));
  const result = [];
  for (let index = 1; index < count; index += 1) {
    const ratio = index / count;
    result.push({
      latitude: start.latitude + (end.latitude - start.latitude) * ratio,
      longitude: start.longitude + (end.longitude - start.longitude) * ratio,
      priority: 3,
    });
  }
  return result;
}

function evenlySample(points, limit) {
  if (points.length <= limit) return points;
  const sampled = [];
  const step = (points.length - 1) / Math.max(1, limit - 1);
  for (let index = 0; index < limit; index += 1) {
    sampled.push(points[Math.round(index * step)]);
  }
  return sampled;
}

function buildRevealPoints(region, visitedCells, liveTrail, currentLocation, revealRadiusMeters) {
  const trail = (liveTrail || [])
    .filter((point) => regionContains(region, point, 2.6))
    .slice(-80)
    .map((point) => ({
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
      priority: 4,
    }));

  const connectedTrail = [];
  const spacing = Math.max(30, revealRadiusMeters * 0.48);
  for (let index = 0; index < trail.length; index += 1) {
    if (index > 0) connectedTrail.push(...interpolateSegment(trail[index - 1], trail[index], spacing));
    connectedTrail.push(trail[index]);
  }

  const visited = [];
  const visitedStart = Math.max(0, visitedCells.length - 480);
  for (let index = visitedStart; index < visitedCells.length; index += 1) {
    const center = FogEngine.cellCenter(visitedCells[index]);
    if (center && regionContains(region, center, 2.6)) {
      visited.push({ ...center, priority: 2 });
    }
  }

  const current = currentLocation
    ? [{
        latitude: Number(currentLocation.latitude),
        longitude: Number(currentLocation.longitude),
        current: true,
        priority: 10,
      }]
    : [];

  const recentTrail = evenlySample(connectedTrail, 20);
  const visitedSample = evenlySample(visited, 15);
  const points = dedupePoints(
    [...current, ...recentTrail.reverse(), ...visitedSample.reverse()],
    Math.max(42, revealRadiusMeters * 0.55)
  )
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_REVEAL_HOLES);

  return points;
}

function circleCoordinates(center, radiusMeters, segments = HOLE_SEGMENTS) {
  const result = [];
  const phase = hash(Number(center.latitude) * 1000 + Number(center.longitude) * 1000) * Math.PI * 2;
  for (let index = 0; index < segments; index += 1) {
    const angle = phase + (index / segments) * Math.PI * 2;
    const irregularity = 0.94 + hash(index * 31 + Number(center.latitude) * 10000) * 0.12;
    result.push(FogEngine.offsetPoint(
      center,
      Math.cos(angle) * radiusMeters * irregularity,
      Math.sin(angle) * radiusMeters * irregularity
    ));
  }
  return result;
}

function outerPolygon(region, multiplier = 3.2) {
  const lat = Number(region.latitude);
  const lng = Number(region.longitude);
  const latSpan = Math.max(0.012, Number(region.latitudeDelta || 0.03) * multiplier);
  const lngSpan = Math.max(0.012, Number(region.longitudeDelta || 0.03) * multiplier);
  return [
    { latitude: lat + latSpan, longitude: lng - lngSpan },
    { latitude: lat + latSpan, longitude: lng + lngSpan },
    { latitude: lat - latSpan, longitude: lng + lngSpan },
    { latitude: lat - latSpan, longitude: lng - lngSpan },
  ];
}

function normalizeOverlayBounds(pointA, pointB) {
  const lat1 = Number(pointA?.latitude);
  const lng1 = Number(pointA?.longitude);
  const lat2 = Number(pointB?.latitude);
  const lng2 = Number(pointB?.longitude);

  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;

  // react-native-maps expects [[southLatitude, westLongitude], [northLatitude, eastLongitude]].
  // Always normalize both axes so AIRMapOverlay cannot receive inverted bounds.
  return [
    [Math.min(lat1, lat2), Math.min(lng1, lng2)],
    [Math.max(lat1, lat2), Math.max(lng1, lng2)],
  ];
}

function cloudBounds(center, widthMeters, heightMeters) {
  const northEast = FogEngine.offsetPoint(center, widthMeters / 2, heightMeters / 2);
  const southWest = FogEngine.offsetPoint(center, -widthMeters / 2, -heightMeters / 2);
  return normalizeOverlayBounds(northEast, southWest);
}

function buildClouds(region, revealPoints, revealRadiusMeters) {
  const latitude = Number(region.latitude || 0);
  const latitudeSpanMeters = Math.max(500, Number(region.latitudeDelta || 0.03) * 111320 * 2.5);
  const longitudeSpanMeters = Math.max(
    500,
    Number(region.longitudeDelta || 0.03) * 111320 * Math.cos((latitude * Math.PI) / 180) * 2.5
  );
  const centerMercator = FogEngine.toMercator(region.latitude, region.longitude);
  const spacing = clamp(Math.min(latitudeSpanMeters, longitudeSpanMeters) / 5.3, 150, 520);
  const rowStep = spacing * 0.78;
  const colStep = spacing * 0.84;

  const minX = centerMercator.x - longitudeSpanMeters / 2;
  const maxX = centerMercator.x + longitudeSpanMeters / 2;
  const minY = centerMercator.y - latitudeSpanMeters / 2;
  const maxY = centerMercator.y + latitudeSpanMeters / 2;

  const startCol = Math.floor(minX / colStep) - 1;
  const endCol = Math.ceil(maxX / colStep) + 1;
  const startRow = Math.floor(minY / rowStep) - 1;
  const endRow = Math.ceil(maxY / rowStep) + 1;
  const clouds = [];

  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      const seed = ((row * 73856093) ^ (col * 19349663)) >>> 0;
      const stagger = row % 2 ? colStep * 0.36 : 0;
      const center = FogEngine.fromMercator(
        col * colStep + stagger + (hash(seed + 7) - 0.5) * colStep * 0.28,
        row * rowStep + (hash(seed + 13) - 0.5) * rowStep * 0.26
      );
      if (!regionContains(region, center, 1.7)) continue;

      const bankRadius = spacing * (0.58 + hash(seed + 19) * 0.22);
      const nearReveal = revealPoints.some((point) => (
        FogEngine.distanceMeters(center, point) < revealRadiusMeters * (point.current ? 1.45 : 1.25) + bankRadius
      ));
      if (nearReveal) continue;

      const widthMeters = spacing * (1.75 + hash(seed + 23) * 0.70);
      const heightMeters = widthMeters * (0.45 + hash(seed + 29) * 0.12);
      const bounds = cloudBounds(center, widthMeters, heightMeters);
      if (!bounds) continue;

      clouds.push({
        id: `native-cloud-${row}-${col}`,
        image: CLOUD_TEXTURES[Math.abs(row + col) % CLOUD_TEXTURES.length],
        bounds,
        opacity: 0.42 + hash(seed + 31) * 0.16,
        distance: FogEngine.distanceMeters(center, region),
      });
    }
  }

  return clouds
    .sort((a, b) => a.distance - b.distance)
    .slice(0, MAX_CLOUDS);
}

function NativeMapFogLayer({
  region,
  visitedCells = [],
  liveTrail = [],
  currentLocation = null,
  revealRadiusMeters = 105,
}) {
  const model = useMemo(() => {
    if (!region) return null;
    const revealPoints = buildRevealPoints(
      region,
      visitedCells,
      liveTrail,
      currentLocation,
      revealRadiusMeters
    );
    return {
      outer: outerPolygon(region),
      holes: revealPoints.map((point) => circleCoordinates(
        point,
        revealRadiusMeters * (point.current ? 1.22 : 1.02)
      )),
      clouds: buildClouds(region, revealPoints, revealRadiusMeters),
    };
  }, [currentLocation, liveTrail, region, revealRadiusMeters, visitedCells]);

  if (!model) return null;

  return (
    <>
      <Polygon
        coordinates={model.outer}
        holes={model.holes}
        fillColor="rgba(3, 10, 16, 0.63)"
        strokeColor="rgba(0,0,0,0)"
        strokeWidth={0}
        tappable={false}
        zIndex={5000}
      />

      {model.clouds.map((cloud) => (
        <Overlay
          key={cloud.id}
          image={cloud.image}
          bounds={cloud.bounds}
          opacity={cloud.opacity}
          tappable={false}
        />
      ))}
    </>
  );
}

export default React.memo(NativeMapFogLayer);
