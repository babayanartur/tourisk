import { Image } from "react-native";
import { API_BASE_URL } from "./apiClient";

const LOCAL_PAWNS = {
  pawn_green: require("../assets/pawns/pawn_green_v13.png"),
  pawn_bronze: require("../assets/pawns/pawn_bronze_v13.png"),
  pawn_silver: require("../assets/pawns/pawn_silver_v13.png"),
  pawn_gold: require("../assets/pawns/pawn_gold_v13.png"),
  pawn_azure: require("../assets/pawns/pawn_azure_v13.png"),
  pawn_violet: require("../assets/pawns/pawn_violet_v13.png"),
  pawn_ember: require("../assets/pawns/pawn_ember_v13.png"),
  pawn_crystal: require("../assets/pawns/pawn_crystal_v13.png"),
  pawn_shadow: require("../assets/pawns/pawn_shadow_v13.png"),
  pawn_aurora: require("../assets/pawns/pawn_aurora_v13.png"),
};

export function resolveAssetUrl(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${API_BASE_URL}${raw}`;
  return `${API_BASE_URL}/${raw}`;
}

export function getLocalPawnFallback(pawn) {
  const id = typeof pawn === "string" ? pawn : pawn?.id;
  return LOCAL_PAWNS[id] || LOCAL_PAWNS.pawn_green;
}

export function getPawnSource(pawn) {
  if (!pawn) return LOCAL_PAWNS.pawn_green;
  if (typeof pawn === "number") return pawn;
  if (typeof pawn === "string") return LOCAL_PAWNS[pawn] || LOCAL_PAWNS.pawn_green;

  const raw = pawn.imageUrl || pawn.imagePath || pawn.image || "";
  if (typeof raw === "number") return raw;

  const remote = resolveAssetUrl(raw);
  return remote ? { uri: remote } : getLocalPawnFallback(pawn);
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
