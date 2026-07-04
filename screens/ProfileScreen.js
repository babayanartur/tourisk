import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveDemoUserProfile } from "../services/firebaseUserService";

export default function ProfileScreen() {
  const [checkins, setCheckins] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const saved = await AsyncStorage.getItem("checkins");
    if (saved) {
      setCheckins(JSON.parse(saved));
    }
  };

const uniqueCheckins = checkins.filter((item, index, array) => {
  const city = (item.title || item.city || "").toLowerCase();

  return index === array.findIndex((x) => {
    const xCity = (x.title || x.city || "").toLowerCase();
    return xCity === city;
  });
});
  const cities = uniqueCheckins.length;
  const countries = [...new Set(uniqueCheckins.map((c) => c.country))].length;
  const xp = Math.max(cities * 120, 120);
  const coins = Math.max(cities * 45, 100);
useEffect(() => {
  saveDemoUserProfile({
    xp,
    coins,
    cities,
    countries,
  });
}, [xp, coins, cities, countries]);
  let level = "New Explorer";
  if (xp >= 300) level = "City Hunter";
  if (xp >= 700) level = "World Traveler";
  if (xp >= 1500) level = "Tourisk Legend";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.avatar}>A</Text>
      <Text style={styles.name}>Artur Babayan</Text>
      <Text style={styles.level}>{level}</Text>
      <View style={styles.liveStats}>
  <Text style={styles.liveText}>📍 Yerevan</Text>
  <Text style={styles.liveText}>🌍 Armenia</Text>
  <Text style={styles.liveText}>🔥 Streak: 6 days</Text>
  <Text style={styles.liveText}>🏆 3 Badges</Text>
</View>

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Explorer Profile</Text>
        <Text style={styles.heroText}>Твой прогресс, достижения и история путешествий</Text>

        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>

        <Text style={styles.progressText}>Level progress: 65%</Text>
      </View>

      <View style={styles.grid}>
        <Stat value={xp} label="XP" />
        <Stat value={coins} label="Coins" />
        <Stat value={cities} label="Cities" />
        <Stat value={countries} label="Countries" />
      </View>

      <Text style={styles.sectionTitle}>Achievements</Text>

      <View style={styles.badgesRow}>
        <Badge title="First Check-in" />
        <Badge title="City Explorer" />
        <Badge title="Daily Streak" />
      </View>

      <Text style={styles.sectionTitle}>Travel History</Text>

      {uniqueCheckins.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Пока нет путешествий</Text>
          <Text style={styles.emptyText}>Сделай первый check-in на карте.</Text>
        </View>
      ) : (
        uniqueCheckins.map((item, index) => (
          <View key={index} style={styles.cityCard}>
            <Text style={styles.cityName}>{item.title || item.city}</Text>
            <Text style={styles.country}>{item.country}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function Stat({ value, label }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Badge({ title }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#071d36",
    padding: 22,
    paddingTop: 70,
    paddingBottom: 120,
  },
  avatar: {
    color: "#ffffff",
    backgroundColor: "#f59e0b",
    width: 88,
    height: 88,
    borderRadius: 44,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 44,
    fontWeight: "900",
    alignSelf: "center",
  },
  name: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 16,
  },
  level: {
    color: "#34d399",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  heroCard: {
    backgroundColor: "#102b52",
    borderRadius: 28,
    padding: 22,
    marginBottom: 20,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
  },
  heroText: {
    color: "#b8c7dc",
    fontSize: 15,
    marginTop: 8,
  },
  progressBar: {
    height: 12,
    backgroundColor: "#1e3a5f",
    borderRadius: 10,
    marginTop: 18,
    overflow: "hidden",
  },
  progressFill: {
    width: "65%",
    height: "100%",
    backgroundColor: "#34d399",
  },
  progressText: {
    color: "#b8c7dc",
    marginTop: 8,
    fontSize: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    backgroundColor: "#11284a",
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
  },
  statValue: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
  },
  statLabel: {
    color: "#b8c7dc",
    fontSize: 14,
    marginTop: 6,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 18,
    marginBottom: 14,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  badge: {
    backgroundColor: "#064e3b",
    borderRadius: 18,
    padding: 14,
    marginRight: 10,
    marginBottom: 10,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: "#11284a",
    borderRadius: 22,
    padding: 20,
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  emptyText: {
    color: "#b8c7dc",
    marginTop: 8,
  },
  cityCard: {
    backgroundColor: "#11284a",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
  },
  cityName: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  country: {
    color: "#9fb8d4",
    marginTop: 6,
  },
  liveStats: {
  backgroundColor: "#102b52",
  borderRadius: 24,
  padding: 18,
  marginBottom: 20,
},

liveText: {
  color: "#ffffff",
  fontSize: 17,
  fontWeight: "800",
  marginBottom: 8,
},
});