export class GeoJsonLoader {
  static async loadCity(cityName) {
    switch (cityName) {
      case "Yerevan":
      case "Ереван":
        return require("../../data/yerevanBoundary");

      default:
        return null;
    }
  }
}