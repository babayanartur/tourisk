export class FogEngine {
  static getFogCellsAroundLocation(currentCellId, radius = 3) {
    if (!currentCellId) return [];

    const parts = currentCellId.split(":");
    const districtId = parts[0] || "unknown";
    const rawCellId = parts[1] || currentCellId;

    const [row, col] = rawCellId.split("_").map(Number);

    if (isNaN(row) || isNaN(col)) return [];

    const cells = [];

    for (let r = row - radius; r <= row + radius; r++) {
      for (let c = col - radius; c <= col + radius; c++) {
        cells.push(`${districtId}:${r}_${c}`);
      }
    }

    return cells;
  }

  static getHiddenCells(nearbyCells, visitedCells) {
    return nearbyCells.filter((cellId) => !visitedCells.includes(cellId));
  }
  static buildFogPolygons(hiddenCells) {
  return [];
}
}