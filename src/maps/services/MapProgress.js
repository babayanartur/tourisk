export class MapProgress {
  static getDistrictColor(progress) {
    if (progress >= 80) return "rgba(34,197,94,0.35)";
    if (progress >= 40) return "rgba(124,77,255,0.25)";
    return "rgba(156,163,175,0.15)";
  }

  static getCityProgress(districts) {
    if (!districts || districts.length === 0) return 0;

    const total = districts.reduce((sum, district) => {
      return sum + (district.progress || 0);
    }, 0);

    return Math.round(total / districts.length);
  }
  static isPointInsideDistrict(latitude, longitude, district) {
  if (!district || !district.boundary) return false;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  district.boundary.forEach((point) => {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  });

  return (
    latitude >= minLat &&
    latitude <= maxLat &&
    longitude >= minLng &&
    longitude <= maxLng
  );
}
}