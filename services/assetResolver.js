import { Image } from "react-native";
import { API_BASE_URL } from "./apiClient";

const localPawn = require("../assets/player/pawn_green.png");

export function getPawnSource(pawn) {
  if (!pawn) return localPawn;

  const raw = pawn.imagePath || pawn.imageUrl || pawn.image || "";
  if (!raw || raw.startsWith("local:")) return localPawn;
  if (typeof raw === "number") return raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return { uri: raw };
  if (raw.startsWith("/")) return { uri: `${API_BASE_URL}${raw}` };
  return { uri: `${API_BASE_URL}/${raw}` };
}

export function getSelectedPawnSource(pawns = [], selectedPawn = "pawn_green") {
  const found = pawns.find((item) => item.id === selectedPawn) || pawns[0];
  return getPawnSource(found);
}

export function preloadPawnImages(pawns = []) {
  pawns.forEach((pawn) => {
    const src = getPawnSource(pawn);
    if (src?.uri) Image.prefetch(src.uri).catch(() => {});
  });
}
