import { WorldClock } from "./WorldClock";

export class WorldTheme {
  static getTheme(date = new Date()) {
    const phase = WorldClock.getTimePhase(date);

    switch (phase) {
      case "morning":
        return {
          timePhase: phase,
          fogColor: "rgba(180,220,170,0.35)",
          glowColor: "#D8F5A2",
          worldLight: "#FFF7D6",
        };

      case "day":
        return {
          timePhase: phase,
          fogColor: "rgba(130,210,120,0.28)",
          glowColor: "#C7FF88",
          worldLight: "#FFFFFF",
        };

      case "evening":
        return {
          timePhase: phase,
          fogColor: "rgba(255,180,90,0.30)",
          glowColor: "#FFD37A",
          worldLight: "#FFE2B3",
        };

      default:
        return {
          timePhase: phase,
          fogColor: "rgba(40,70,130,0.34)",
          glowColor: "#8CC8FF",
          worldLight: "#BFD9FF",
        };
    }
  }
}