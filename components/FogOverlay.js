import React, { useMemo } from "react";
import { Platform } from "react-native";
import { Polygon } from "react-native-maps";
import { FogEngine } from "../src/maps/services/FogEngine";

const MAX_HOLES = Platform.OS === "android" ? 48 : 64;

function circlePoints(center, radiusMeters, seed = 1, count = 10) {
  const coordinates = [];
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count;
    const wave = Math.sin(index * 1.71 + seed * 0.43) * 0.065;
    const waveTwo = Math.cos(index * 2.33 + seed * 0.17) * 0.035;
    const radius = radiusMeters * (1 + wave + waveTwo);
    const point = FogEngine.offsetPoint(center, Math.cos(angle) * radius, Math.sin(angle) * radius);
    if (Number.isFinite(point.latitude) && Number.isFinite(point.longitude)) coordinates.push(point);
  }
  return coordinates.reverse();
}

function selectNearbyCenters(region, visitedCells, currentLocation) {
  const latDelta = Math.max(0.01, Number(region.latitudeDelta || 0.03));
  const lngDelta = Math.max(0.01, Number(region.longitudeDelta || 0.03));
  const selected = [];
  const seenBuckets = new Set();

  if (currentLocation?.latitude != null && currentLocation?.longitude != null) {
    selected.push({
      latitude: Number(currentLocation.latitude),
      longitude: Number(currentLocation.longitude),
    });
  }

  for (let index = visitedCells.length - 1; index >= 0; index -= 1) {
    const point = FogEngine.cellCenter(visitedCells[index]);
    if (!point) continue;
    if (Math.abs(point.latitude - region.latitude) > latDelta * 1.35) continue;
    if (Math.abs(point.longitude - region.longitude) > lngDelta * 1.35) continue;

    const latBucket = Math.round(point.latitude / 0.00036);
    const lngBucket = Math.round(point.longitude / 0.00036);
    const bucket = `${latBucket}:${lngBucket}`;
    if (seenBuckets.has(bucket)) continue;
    seenBuckets.add(bucket);

    const duplicate = selected.some((existing) => FogEngine.distanceMeters(existing, point) < 38);
    if (!duplicate) selected.push(point);
    if (selected.length >= MAX_HOLES) break;
  }

  return selected;
}

function FogOverlay({ region, visitedCells = [], revealRadiusMeters = 105, currentLocation = null }) {
  const { outer, holes } = useMemo(() => {
    if (!region) return { outer: [], holes: [] };

    const latDelta = Math.max(0.01, Number(region.latitudeDelta || 0.03));
    const lngDelta = Math.max(0.01, Number(region.longitudeDelta || 0.03));
    const marginLat = latDelta * 2.8;
    const marginLng = lngDelta * 2.8;
    const outerPolygon = [
      { latitude: Number(region.latitude) + marginLat, longitude: Number(region.longitude) - marginLng },
      { latitude: Number(region.latitude) + marginLat, longitude: Number(region.longitude) + marginLng },
      { latitude: Number(region.latitude) - marginLat, longitude: Number(region.longitude) + marginLng },
      { latitude: Number(region.latitude) - marginLat, longitude: Number(region.longitude) - marginLng },
    ];

    const centers = selectNearbyCenters(region, visitedCells, currentLocation);
    const openings = centers
      .map((center, index) => circlePoints(center, revealRadiusMeters * 1.02, index + 17))
      .filter((coordinates) => coordinates.length >= 8);

    return { outer: outerPolygon, holes: openings };
  }, [currentLocation, region, revealRadiusMeters, visitedCells]);

  if (!outer.length) return null;

  return (
    <Polygon
      coordinates={outer}
      holes={holes}
      fillColor="rgba(12, 20, 24, 0.82)"
      strokeColor="rgba(0,0,0,0)"
      strokeWidth={0}
      tappable={false}
      zIndex={7100}
    />
  );
}

export default React.memo(FogOverlay);
