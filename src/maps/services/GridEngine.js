export class GridEngine {
  static CELL_SIZE = 0.00045;
  static METERS_PER_LAT_DEGREE = 111320;

  static getCellId(latitude, longitude) {
    const latCell = Math.floor(Number(latitude) / this.CELL_SIZE);
    const lngCell = Math.floor(Number(longitude) / this.CELL_SIZE);
    return `${latCell}_${lngCell}`;
  }

  static getDistrictCellKey(districtId, cellId) {
    return `${districtId}:${cellId}`;
  }

  static isNewCell(latitude, longitude, visitedCells) {
    const cellId = this.getCellId(latitude, longitude);
    return !visitedCells.includes(cellId);
  }

  static parseCellId(cellId) {
    const raw = String(cellId || "").split(":").pop();
    const [latCell, lngCell] = raw.split("_").map(Number);
    return { latCell, lngCell };
  }

  static getCellCenter(cellId) {
    const { latCell, lngCell } = this.parseCellId(cellId);
    if (!Number.isFinite(latCell) || !Number.isFinite(lngCell)) return null;
    return {
      latitude: (latCell + 0.5) * this.CELL_SIZE,
      longitude: (lngCell + 0.5) * this.CELL_SIZE,
    };
  }

  static getCellIdsInRadius(latitude, longitude, radiusMeters = 105) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    const radius = Math.max(25, Number(radiusMeters || 105));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

    const center = this.parseCellId(this.getCellId(lat, lng));
    const latCellMeters = this.CELL_SIZE * this.METERS_PER_LAT_DEGREE;
    const lngCellMeters = Math.max(12, latCellMeters * Math.cos((lat * Math.PI) / 180));
    const rowRadius = Math.ceil(radius / latCellMeters) + 1;
    const colRadius = Math.ceil(radius / lngCellMeters) + 1;
    const result = [];

    for (let row = center.latCell - rowRadius; row <= center.latCell + rowRadius; row += 1) {
      for (let col = center.lngCell - colRadius; col <= center.lngCell + colRadius; col += 1) {
        const cellId = `${row}_${col}`;
        const point = this.getCellCenter(cellId);
        const dy = (point.latitude - lat) * this.METERS_PER_LAT_DEGREE;
        const dx = (point.longitude - lng) * this.METERS_PER_LAT_DEGREE * Math.cos((lat * Math.PI) / 180);
        const halfCellDiagonal = Math.hypot(latCellMeters, lngCellMeters) / 2;
        if (Math.hypot(dx, dy) <= radius + halfCellDiagonal) result.push(cellId);
      }
    }

    return result;
  }

  static getNeighborCellIds(cellId) {
    const { latCell, lngCell } = this.parseCellId(cellId);
    return {
      top: `${latCell + 1}_${lngCell}`,
      bottom: `${latCell - 1}_${lngCell}`,
      left: `${latCell}_${lngCell - 1}`,
      right: `${latCell}_${lngCell + 1}`,
    };
  }

  static getCellConnections(cellId, visitedCells) {
    const neighbors = this.getNeighborCellIds(cellId);
    return {
      top: visitedCells.includes(neighbors.top),
      bottom: visitedCells.includes(neighbors.bottom),
      left: visitedCells.includes(neighbors.left),
      right: visitedCells.includes(neighbors.right),
    };
  }
}
