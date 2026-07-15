import { GridEngine } from "./GridEngine";

export class FogEngine {
  static parseCell(cellId) {
    if (!cellId) return null;
    const raw = String(cellId).split(":").pop();
    const [row, col] = raw.split("_").map(Number);
    if (!Number.isFinite(row) || !Number.isFinite(col)) return null;
    return { row, col };
  }

  static cellCenter(cellId) {
    const parsed = this.parseCell(cellId);
    if (!parsed) return null;
    const size = GridEngine.CELL_SIZE;
    return {
      latitude: (parsed.row + 0.5) * size,
      longitude: (parsed.col + 0.5) * size,
    };
  }

  static distanceMeters(a, b) {
    const latitude = (Number(a.latitude) + Number(b.latitude)) / 2;
    const dy = (Number(a.latitude) - Number(b.latitude)) * 111320;
    const dx = (Number(a.longitude) - Number(b.longitude)) * 111320 * Math.cos((latitude * Math.PI) / 180);
    return Math.hypot(dx, dy);
  }

  static offsetPoint(center, eastMeters, northMeters) {
    const latitude = Number(center.latitude);
    const latOffset = northMeters / 111320;
    const lngScale = Math.max(0.2, Math.cos((latitude * Math.PI) / 180));
    const lngOffset = eastMeters / (111320 * lngScale);
    return {
      latitude: latitude + latOffset,
      longitude: Number(center.longitude) + lngOffset,
    };
  }

  static isCoordinateRevealed(latitude, longitude, visitedCells = [], radiusMeters = 88) {
    const point = { latitude: Number(latitude), longitude: Number(longitude) };
    return visitedCells.some((cellId) => {
      const center = this.cellCenter(cellId);
      return center && this.distanceMeters(point, center) <= radiusMeters;
    });
  }

  static getFogCloudsForRegion(region, visitedCells = [], options = {}) {
    if (!region || !Number.isFinite(Number(region.latitude)) || !Number.isFinite(Number(region.longitude))) return [];

    const latitudeDelta = Math.max(0.004, Math.min(0.24, Number(region.latitudeDelta || 0.028)));
    const longitudeDelta = Math.max(0.004, Math.min(0.24, Number(region.longitudeDelta || 0.028)));
    const revealRadius = Math.max(55, Number(options.revealRadiusMeters || 105));
    const rows = 11;
    const columns = 8;
    const latSpan = latitudeDelta * 1.55;
    const lngSpan = longitudeDelta * 1.55;
    const latStep = latSpan / rows;
    const lngStep = lngSpan / columns;
    const latMeters = latStep * 111320;
    const lngMeters = lngStep * 111320 * Math.cos((Number(region.latitude) * Math.PI) / 180);
    const baseRadius = Math.max(82, Math.max(latMeters, lngMeters) * 0.72);
    const minLatitude = Number(region.latitude) - latSpan / 2;
    const minLongitude = Number(region.longitude) - lngSpan / 2;
    const maxLatitude = minLatitude + latSpan;
    const maxLongitude = minLongitude + lngSpan;
    const visitedCenters = visitedCells
      .map((cellId) => this.cellCenter(cellId))
      .filter((point) => point
        && point.latitude >= minLatitude - latStep * 2
        && point.latitude <= maxLatitude + latStep * 2
        && point.longitude >= minLongitude - lngStep * 2
        && point.longitude <= maxLongitude + lngStep * 2);
    const clouds = [];

    for (let row = 0; row <= rows; row += 1) {
      for (let col = 0; col <= columns; col += 1) {
        const seed = (row + 31) * 73856093 ^ (col + 17) * 19349663 ^ Math.round(Number(region.latitude) * 1000);
        const jitterLat = (this.hash(seed) - 0.5) * latStep * 0.36;
        const jitterLng = (this.hash(seed + 71) - 0.5) * lngStep * 0.36;
        const center = {
          latitude: minLatitude + row * latStep + jitterLat,
          longitude: minLongitude + col * lngStep + jitterLng,
        };
        const nearVisited = visitedCenters.some((visited) => this.distanceMeters(center, visited) <= revealRadius + baseRadius * 0.42);
        if (nearVisited) continue;

        const radius = baseRadius * (0.88 + this.hash(seed + 113) * 0.24);
        const opacity = 0.46 + this.hash(seed + 211) * 0.12;
        const lobePattern = [
          [0, 0, 1],
          [-0.52, 0.05, 0.76],
          [0.52, 0.04, 0.78],
          [-0.25, 0.36, 0.62],
          [0.27, 0.34, 0.66],
        ];

        clouds.push({
          id: `fog-${row}-${col}-${Math.round(center.latitude * 10000)}-${Math.round(center.longitude * 10000)}`,
          lobes: lobePattern.map(([x, y, scale], index) => ({
            id: `${index}`,
            center: this.offsetPoint(center, x * radius, y * radius),
            radius: radius * scale,
            opacity: Math.max(0.28, opacity - index * 0.022),
          })),
        });
      }
    }

    return clouds;
  }

  static hash(value) {
    const x = Math.sin(Number(value) * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }
}
