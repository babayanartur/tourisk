export class DiscoveryEngine {
  static distanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;

    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }


static getNearbyPlaces(location, places, radius = 300) {
    if (!location) return [];

    return places.filter((place) => {
      const distance = this.distanceMeters(
        location.latitude,
        location.longitude,
        place.latitude,
        place.longitude
      );

      return distance <= radius;
    });
  }
}