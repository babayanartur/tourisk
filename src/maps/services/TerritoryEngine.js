import { GridEngine } from "./GridEngine";

export class TerritoryEngine {
  static parseCell(cellId) {
    const parts = cellId.split(":");
    const coords = (parts[1] || cellId).split("_");

    const row = Number(coords[0]);
    const col = Number(coords[1]);

    if (isNaN(row) || isNaN(col)) return null;

    return { row, col, key: `${row}_${col}` };
  }

  static groupConnectedCells(visitedCells) {
    const cells = visitedCells.map((id) => this.parseCell(id)).filter(Boolean);
    const map = new Map(cells.map((c) => [c.key, c]));
    const visited = new Set();
    const groups = [];

    for (const cell of cells) {
      if (visited.has(cell.key)) continue;

      const group = [];
      const stack = [cell];

      while (stack.length) {
        const current = stack.pop();
        if (!current || visited.has(current.key)) continue;

        visited.add(current.key);
        group.push(current);

        [
          `${current.row - 1}_${current.col}`,
          `${current.row + 1}_${current.col}`,
          `${current.row}_${current.col - 1}`,
          `${current.row}_${current.col + 1}`,
        ].forEach((key) => {
          if (map.has(key) && !visited.has(key)) {
            stack.push(map.get(key));
          }
        });
      }

      groups.push(group);
    }

    return groups;
  }

  static pointKey(point) {
    return `${point.latitude},${point.longitude}`;
  }

  static edgeKey(a, b) {
    const keyA = this.pointKey(a);
    const keyB = this.pointKey(b);
    return keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`;
  }

  static getCellEdges(cell) {
    const size = GridEngine.CELL_SIZE;
    const lat = cell.row * size;
    const lng = cell.col * size;

    const p1 = { latitude: lat, longitude: lng };
    const p2 = { latitude: lat, longitude: lng + size };
    const p3 = { latitude: lat + size, longitude: lng + size };
    const p4 = { latitude: lat + size, longitude: lng };

    return [
      { from: p1, to: p2 },
      { from: p2, to: p3 },
      { from: p3, to: p4 },
      { from: p4, to: p1 },
    ];
  }

  static buildLoop(edges) {
    if (!edges.length) return [];

    const unused = [...edges];
    const first = unused.shift();

    const coordinates = [first.from, first.to];

    while (unused.length > 0) {
      const last = coordinates[coordinates.length - 1];
      const lastKey = this.pointKey(last);

      const index = unused.findIndex(
        (edge) =>
          this.pointKey(edge.from) === lastKey ||
          this.pointKey(edge.to) === lastKey
      );

      if (index === -1) break;

      const edge = unused.splice(index, 1)[0];

      if (this.pointKey(edge.from) === lastKey) {
        coordinates.push(edge.to);
      } else {
        coordinates.push(edge.from);
      }

      const start = this.pointKey(coordinates[0]);
      const end = this.pointKey(coordinates[coordinates.length - 1]);

      if (start === end) break;
    }

    return coordinates;
  }

  static getMergedTerritoryPolygons(visitedCells) {
    const groups = this.groupConnectedCells(visitedCells);

    return groups
      .map((group, groupIndex) => {
        const edgeMap = new Map();

        group.forEach((cell) => {
          this.getCellEdges(cell).forEach((edge) => {
            const key = this.edgeKey(edge.from, edge.to);

            if (edgeMap.has(key)) {
              edgeMap.delete(key);
            } else {
              edgeMap.set(key, edge);
            }
          });
        });

        const outerEdges = Array.from(edgeMap.values());
        const coordinates = this.buildLoop(outerEdges);

        if (coordinates.length < 3) return null;

        return {
          id: `territory-${groupIndex}`,
          groupIndex,
          coordinates,
        };
      })
      .filter(Boolean);
  }

  static getOutlineTerritoryPolygons(visitedCells) {
    return this.getMergedTerritoryPolygons(visitedCells);
  }
}