import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";

const getCityImage = (city) => {
  switch (city) {
    case "Yerevan":
    case "Ереван":
      return "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=1200";

    default:
      return "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200";
  }
};

export default function CityCard({ selectedCity, onClose, progress }) {
  if (!selectedCity) return null;

  return (
    <TouchableOpacity style={styles.cityCard}>
      <Image
        source={{ uri: getCityImage(selectedCity.title) }}
        style={styles.cityImage}
      />

      <View style={styles.cityInfo}>
        <Text style={styles.cityName}>{selectedCity.title}</Text>
        <Text style={styles.cityCountry}>🌍 {selectedCity.country}</Text>
        <Text style={styles.cityStatus}>
          ✅ Посещено • ⭐ {selectedCity.xp || 10} XP
        </Text>
        <Text style={styles.cityDate}>
          📅 {selectedCity.visitedAt || "Сегодня"}
        </Text>
        <Text style={styles.cityDate}>🧭 Исследовано: {progress}%</Text>
      </View>

      <TouchableOpacity onPress={onClose}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cityCard: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 115,
    backgroundColor: "#102b52",
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  cityCountry: {
    color: "#c7d6ea",
    fontSize: 15,
    marginTop: 4,
  },
  cityStatus: {
    color: "#7CFC00",
    fontSize: 15,
    marginTop: 6,
    fontWeight: "700",
  },
  cityDate: {
    color: "#9fb8d4",
    fontSize: 14,
    marginTop: 4,
  },
  cityImage: {
    width: 70,
    height: 70,
    borderRadius: 16,
    marginRight: 14,
    backgroundColor: "#1b3b6b",
  },
  closeText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
});