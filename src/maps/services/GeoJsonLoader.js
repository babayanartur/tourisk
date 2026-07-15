export class GeoJsonLoader {
  static async loadCity(cityName) {
    switch (cityName) {
      case "Yerevan":
      case "Ереван":
        return require("../data/cities/yerevanBoundary");

      default:
        return null;
    }
  }
}