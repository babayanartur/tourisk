export class WorldClock {
  static getTimePhase(date = new Date()) {
    const hour = date.getHours();

    if (hour >= 5 && hour < 9) {
      return "morning";
    }

    if (hour >= 9 && hour < 17) {
      return "day";
    }

    if (hour >= 17 && hour < 20) {
      return "evening";
    }

    return "night";
  }
}