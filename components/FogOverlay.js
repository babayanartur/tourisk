import React, { useMemo } from "react";
import { Polygon } from "react-native-maps";
import { FogEngine } from "../src/maps/services/FogEngine";

function circlePoints(center, radiusMeters, seed = 1, count = 18) {
  const coordinates = [];
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count;
    const wave = Math.sin(index * 1.71 + seed * 0.43) * 0.09;
    const waveTwo = Math.cos(index * 2.33 + seed * 0.17) * 0.05;
    const radius = radiusMeters * (1 + wave + waveTwo);
    coordinates.push(
      FogEngine.offsetPoint(
        center,
        Math.cos(angle) * radius,
        Math.sin(angle) * radius
      )
    );
  }
  return coordinates;
}

function cross(origin, a, b) {
  return (a.longitude - origin.longitude) * (b.latitude - origin.latitude)
    - (a.latitude - origin.latitude) * (b.longitude - origin.longitude);
}

function convexHull(points) {
  if (points.length <= 3) return [...points];
  const sorted = [...points].sort((a, b) => (
    a.longitude === b.longitude
      ? a.latitude - b.latitude
      : a.longitude - b.longitude
  ));

  const lower = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  }

  const upper = [];
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }

  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

function selectNearbyCenters(region, visitedCells, currentLocation) {
  const latDelta = Math.max(0.01, Number(region.latitudeDelta || 0.03));
  const lngDelta = Math.max(0.01, Number(region.longitudeDelta || 0.03));
  const candidates = visitedCells
    .map((cellId) => FogEngine.cellCenter(cellId))
    .filter(Boolean)
    .filter((point) => (
      Math.abs(point.latitude - region.latitude) <= latDelta * 1.15
      && Math.abs(point.longitude - region.longitude) <= lngDelta * 1.15
    ));

  const ordered = currentLocation
    ? [currentLocation, ...candidates.sort((a, b) => (
      FogEngine.distanceMeters(a, currentLocation) - FogEngine.distanceMeters(b, currentLocation)
    ))]
    : candidates;

  const selected = [];
  for (const point of ordered) {
    const duplicate = selected.some((existing) => FogEngine.distanceMeters(existing, point) < 34);
    if (!duplicate) selected.push(point);
    if (selected.length >= 72) break;
  }
  return selected;
}

export default function FogOverlay({ region, visitedCells = [], currentLocation, revealRadiusMeters = 105 }) {
  const { outer, holes } = useMemo(() => {
    if (!region) return { outer: [], holes: [] };

    const latDelta = Math.max(0.01, Number(region.latitudeDelta || 0.03));
    const lngDelta = Math.max(0.01, Number(region.longitudeDelta || 0.03));
    const marginLat = latDelta * 4;
    const marginLng = lngDelta * 4;
    const outerPolygon = [
      { latitude: region.latitude + marginLat, longitude: region.longitude - marginLng },
      { latitude: region.latitude + marginLat, longitude: region.longitude + marginLng },
      { latitude: region.latitude - marginLat, longitude: region.longitude + marginLng },
      { latitude: region.latitude - marginLat, longitude: region.longitude - marginLng },
    ];

    const centers = selectNearbyCenters(region, visitedCells, currentLocation);
    if (!centers.length) return { outer: outerPolygon, holes: [] };

    const cloudEdgePoints = centers.flatMap((center, index) => (
      circlePoints(
        center,
        revealRadiusMeters * (index === 0 ? 1.25 : 1.04),
        index + 11,
        index === 0 ? 24 : 12
      )
    ));
    const combinedOpening = convexHull(cloudEdgePoints).reverse();

    return { outer: outerPolygon, holes: combinedOpening.length >= 3 ? [combinedOpening] : [] };
  }, [currentLocation, region, revealRadiusMeters, visitedCells]);

  if (!outer.length) return null;

  return (
    <Polygon
      coordinates={outer}
      holes={holes}
      fillColor="rgba(198, 207, 201, 0.82)"
      strokeColor="rgba(0,0,0,0)"
      strokeWidth={0}
      tappable={false}
      zIndex={7100}
    />
  );
}
