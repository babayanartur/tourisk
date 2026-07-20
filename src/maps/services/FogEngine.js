import { GridEngine } from "./GridEngine";

const EARTH_RADIUS = 6378137;

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

  static toMercator(latitude, longitude) {
    const lat = Math.max(-85, Math.min(85, Number(latitude))) * Math.PI / 180;
    const lng = Number(longitude) * Math.PI / 180;
    return {
      x: EARTH_RADIUS * lng,
      y: EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + lat / 2)),
    };
  }

  static fromMercator(x, y) {
    return {
      latitude: (2 * Math.atan(Math.exp(y / EARTH_RADIUS)) - Math.PI / 2) * 180 / Math.PI,
      longitude: (x / EARTH_RADIUS) * 180 / Math.PI,
    };
  }

  static getFogCloudsForRegion(region, visitedCells = [], options = {}) {
    if (!region || !Number.isFinite(Number(region.latitude)) || !Number.isFinite(Number(region.longitude))) return [];

    const latitudeDelta = Math.max(0.004, Math.min(0.18, Number(region.latitudeDelta || 0.028)));
    const longitudeDelta = Math.max(0.004, Math.min(0.18, Number(region.longitudeDelta || 0.028)));
    const revealRadius = Math.max(55, Number(options.revealRadiusMeters || 105));
    const maxClouds = Math.max(12, Math.min(38, Number(options.maxClouds || 32)));
    const centerLat = Number(region.latitude);
    const centerLng = Number(region.longitude);

    // Region deltas are the whole visible span. We render beyond the edges so rotation,
    // aspect-ratio differences and map inertia do not expose bare satellite tiles.
    const northWest = this.toMercator(
      centerLat + latitudeDelta * 0.76,
      centerLng - longitudeDelta * 0.76
    );
    const southEast = this.toMercator(
      centerLat - latitudeDelta * 0.76,
      centerLng + longitudeDelta * 0.76
    );
    const minX = Math.min(northWest.x, southEast.x);
    const maxX = Math.max(northWest.x, southEast.x);
    const minY = Math.min(northWest.y, southEast.y);
    const maxY = Math.max(northWest.y, southEast.y);
    const extendedArea = Math.max(1, (maxX - minX) * (maxY - minY));
    let spacing = Math.max(120, Math.sqrt(extendedArea / maxClouds));

    const getGridBounds = (nextSpacing) => {
      const startCol = Math.floor(minX / nextSpacing) - 1;
      const endCol = Math.ceil(maxX / nextSpacing) + 1;
      const startRow = Math.floor(minY / nextSpacing) - 1;
      const endRow = Math.ceil(maxY / nextSpacing) + 1;
      return {
        startCol,
        endCol,
        startRow,
        endRow,
        count: (endCol - startCol + 1) * (endRow - startRow + 1),
      };
    };

    let grid = getGridBounds(spacing);
    for (let attempt = 0; attempt < 40 && grid.count > maxClouds + 8; attempt += 1) {
      spacing *= 1.08;
      grid = getGridBounds(spacing);
    }
    const { startCol, endCol, startRow, endRow } = grid;

    const visitedCenters = [];
    if (options.currentLocation?.latitude != null && options.currentLocation?.longitude != null) {
      visitedCenters.push({
        latitude: Number(options.currentLocation.latitude),
        longitude: Number(options.currentLocation.longitude),
      });
    }

    for (let index = visitedCells.length - 1; index >= 0; index -= 1) {
      const point = this.cellCenter(visitedCells[index]);
      if (!point) continue;
      if (Math.abs(point.latitude - centerLat) > latitudeDelta * 1.05) continue;
      if (Math.abs(point.longitude - centerLng) > longitudeDelta * 1.05) continue;

      // A 45 m bucket keeps the path continuous while avoiding thousands of checks.
      const duplicate = visitedCenters.some((existing) => this.distanceMeters(existing, point) < 45);
      if (!duplicate) visitedCenters.push(point);
      if (visitedCenters.length >= 180) break;
    }

    const clouds = [];
    for (let row = startRow; row <= endRow; row += 1) {
      for (let col = startCol; col <= endCol; col += 1) {
        const seed = ((row * 73856093) ^ (col * 19349663)) >>> 0;
        const staggerX = row % 2 === 0 ? 0 : spacing * 0.46;
        const jitterX = (this.hash(seed + 17) - 0.5) * spacing * 0.34;
        const jitterY = (this.hash(seed + 71) - 0.5) * spacing * 0.30;
        const center = this.fromMercator(
          (col + 0.5) * spacing + staggerX + jitterX,
          (row + 0.5) * spacing + jitterY
        );

        const cloudRadius = Math.max(135, spacing * (0.45 + this.hash(seed + 113) * 0.12));
        // The centre of a cloud stays outside the revealed route, while its soft edges
        // may overlap the boundary. That produces a natural game-like opening instead
        // of a sterile circular hole around the player.
        const nearVisited = visitedCenters.some((visited) => (
          this.distanceMeters(center, visited) <= revealRadius + cloudRadius * 0.16
        ));
        if (nearVisited) continue;

        // Each marker renders a two-texture cloud bank. Bigger overlapping banks give
        // full coverage with a conservative native-marker count.
        const width = Math.round(285 + this.hash(seed + 211) * 155);
        clouds.push({
          id: `fog-${row}-${col}`,
          center,
          width,
          height: Math.round(width * (0.58 + this.hash(seed + 251) * 0.12)),
          opacity: 0.78 + this.hash(seed + 307) * 0.18,
          variant: 1 + Math.floor(this.hash(seed + 401) * 3),
          rotation: Math.round((this.hash(seed + 443) - 0.5) * 28),
          flip: this.hash(seed + 479) > 0.5,
          priority: this.distanceMeters(center, region),
        });
      }
    }

    // Adaptive spacing normally keeps this below the cap. The small overflow guard is
    // only for extreme aspect ratios and prevents native-map memory spikes.
    if (clouds.length <= maxClouds + 8) return clouds;
    return clouds.sort((a, b) => a.priority - b.priority).slice(0, maxClouds + 8);
  }

  static hash(value) {
    const x = Math.sin(Number(value) * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }
}
