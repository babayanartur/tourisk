export class GeoUtils {
  static isPointInsideBounds(point, bounds) {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    bounds.forEach(p => {
      minLat = Math.min(minLat, p.latitude);
      maxLat = Math.max(maxLat, p.latitude);
      minLng = Math.min(minLng, p.longitude);
      maxLng = Math.max(maxLng, p.longitude);
    });

    return (
      point.latitude >= minLat &&
      point.latitude <= maxLat &&
      point.longitude >= minLng &&
      point.longitude <= maxLng
    );
  }
}