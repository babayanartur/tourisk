export class GridEngine {
static CELL_SIZE = 0.00045;
  static getCellId(latitude, longitude) {
    const latCell = Math.floor(latitude / this.CELL_SIZE);
    const lngCell = Math.floor(longitude / this.CELL_SIZE);

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
    const [latCell, lngCell] = cellId.split("_").map(Number);

    return {
      latCell,
      lngCell,
    };
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