export class LevelEngine {
  static FIRST_LEVEL_REQUIREMENTS = [100, 180, 300, 450, 650];

  static getLevelRequirement(level) {
    const safeLevel = Math.max(1, Math.floor(Number(level || 1)));
    if (safeLevel <= this.FIRST_LEVEL_REQUIREMENTS.length) {
      return this.FIRST_LEVEL_REQUIREMENTS[safeLevel - 1];
    }

    const step = safeLevel - this.FIRST_LEVEL_REQUIREMENTS.length;
    const raw = 650 + 150 * step + 25 * step * step;
    return Math.ceil(raw / 25) * 25;
  }

  static getLevelStartXp(level) {
    const safeLevel = Math.max(1, Math.floor(Number(level || 1)));
    let total = 0;
    for (let current = 1; current < safeLevel; current += 1) {
      total += this.getLevelRequirement(current);
    }
    return total;
  }

  static getLevel(xp) {
    const safeXp = Math.max(0, Number(xp || 0));
    let level = 1;
    let threshold = this.getLevelRequirement(level);

    while (safeXp >= threshold && level < 500) {
      level += 1;
      threshold += this.getLevelRequirement(level);
    }
    return level;
  }

  static getCurrentLevelXp(xp) {
    const safeXp = Math.max(0, Number(xp || 0));
    const level = this.getLevel(safeXp);
    return Math.max(0, Math.floor(safeXp - this.getLevelStartXp(level)));
  }

  static getXpForNextLevel(xp = 0) {
    return this.getLevelRequirement(this.getLevel(xp));
  }

  static getNextLevelXp(level) {
    return this.getLevelStartXp(Math.max(1, Number(level || 1)) + 1);
  }

  static getRemainingXp(xp) {
    return Math.max(0, this.getXpForNextLevel(xp) - this.getCurrentLevelXp(xp));
  }

  static getProgressPercent(xp) {
    const requirement = Math.max(1, this.getXpForNextLevel(xp));
    return Math.min(100, Math.max(0, (this.getCurrentLevelXp(xp) / requirement) * 100));
  }

  static getTitle(level) {
    if (level >= 20) return "Легенда пути";
    if (level >= 10) return "Мастер исследования";
    if (level >= 5) return "Исследователь";
    if (level >= 2) return "Следопыт";
    return "Новый исследователь";
  }
}
