import { GridEngine } from "./GridEngine";

export class ProgressEngine {
  static calculateDistrictProgress(visitedCells, district) {
    if (!district || !visitedCells) return 0;

   const districtCells = visitedCells.filter((cellId) =>
  cellId.startsWith(`${district.id}:`)
);

const totalCells = district.totalCells || 20;

const progress = Math.round((districtCells.length / totalCells) * 100);

return Math.min(progress, 100);
  }

  static calculateCityProgress(districts) {
    if (!districts || districts.length === 0) return 0;

    const total = districts.reduce((sum, district) => {
      return sum + (district.progress || 0);
    }, 0);

    return Math.round(total / districts.length);
  }
}
