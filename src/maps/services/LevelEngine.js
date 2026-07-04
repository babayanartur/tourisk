export class LevelEngine {
  static XP_PER_TERRITORY = 10;

  static getXpFromTerritories(territoriesCount) {
    return territoriesCount * this.XP_PER_TERRITORY;
  }

  static getLevel(xp) {
    return Math.floor(xp / 100) + 1;
  }

  static getCurrentLevelXp(xp) {
    return xp % 100;
  }

  static getXpForNextLevel() {
    return 100;
  }
static getNextLevelXp(level) {
  return level * 100;
}

static getRemainingXp(xp) {
  const level = this.getLevel(xp);
  return this.getNextLevelXp(level) - xp;
}
  static getProgressPercent(xp) {
    return this.getCurrentLevelXp(xp);
  }

  static getTitle(level) {
    if (level >= 10) return "Master Explorer";
    if (level >= 5) return "Explorer";
    if (level >= 2) return "Pathfinder";

    return "New Explorer";
  }
}