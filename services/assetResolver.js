import { Image } from "react-native";
import { API_BASE_URL } from "./apiClient";

export function resolveAssetUrl(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${API_BASE_URL}${raw}`;
  return `${API_BASE_URL}/${raw}`;
}

// Оставлено для совместимости существующих экранов. Локальных изображений
// фигурок в mobile больше нет: весь контент приходит с backend.
export function getLocalPawnFallback() {
  return null;
}

export function getPawnSource(pawn) {
  if (!pawn || typeof pawn === "string") return null;
  if (typeof pawn === "number") return pawn;

  const raw = pawn.imageUrl || pawn.imagePath || pawn.image || "";
  if (typeof raw === "number") return raw;

  const remote = resolveAssetUrl(raw);
  return remote ? { uri: remote } : null;
}

export function getContentImageSource(item) {
  const imagePath = item?.imagePath || item?.image || "";
  const shouldUseBundledImage = item?.localImage
    && (!imagePath || imagePath === item.defaultImagePath);
  if (shouldUseBundledImage) return item.localImage;

  const explicitUrl = item?.imageUrl || "";
  if (explicitUrl) return { uri: resolveAssetUrl(explicitUrl) };

  const remote = typeof imagePath === "number" ? imagePath : resolveAssetUrl(imagePath);
  if (typeof remote === "number") return remote;
  if (remote) return { uri: remote };
  return item?.localImage || null;
}

export function getSelectedPawn(pawns = [], selectedPawn = "pawn_green") {
  return pawns.find((item) => item.id === selectedPawn) || pawns[0] || {
    id: "pawn_green",
    rarity: "common",
    glowColor: "#a9ec56",
  };
}

export function getSelectedPawnSource(pawns = [], selectedPawn = "pawn_green") {
  return getPawnSource(getSelectedPawn(pawns, selectedPawn));
}

export function getPawnRarity(pawns = [], selectedPawn = "pawn_green") {
  return getSelectedPawn(pawns, selectedPawn)?.rarity || "common";
}

export function preloadPawnImages(pawns = []) {
  pawns.forEach((pawn) => {
    const source = getPawnSource(pawn);
    if (source?.uri) Image.prefetch(source.uri).catch(() => {});
  });
}
