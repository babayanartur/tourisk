import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";

export default function HomeScreen({ navigation }) {  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.top}>
        <Text style={styles.logo}>TOURISK</Text>
        <Text style={styles.gift}>🎁</Text>
      </View>

      <Text style={styles.heroTitle}>Открой мир.{"\n"}Оставь след.</Text>
      <Text style={styles.heroEmoji}>🌍 ✈️ 🏔️</Text>

      <View style={styles.welcomeCard}>
        <Text style={styles.cardTitle}>Привет, путешественник 👋</Text>
        <Text style={styles.cardText}>Готов к новым приключениям?</Text>

        <TouchableOpacity
  style={styles.mainButton}
  onPress={() => navigation.navigate("Карта")}
>
          <Text style={styles.mainButtonText}>Начать путешествие</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>⭐</Text>
          <Text style={styles.statNumber}>10</Text>
          <Text style={styles.statLabel}>очков</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🏙️</Text>
          <Text style={styles.statNumber}>1</Text>
          <Text style={styles.statLabel}>город</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🌍</Text>
          <Text style={styles.statNumber}>1</Text>
          <Text style={styles.statLabel}>страна</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔥 Что уже работает</Text>
        <Text style={styles.feature}>✅ Реальная Google-карта</Text>
        <Text style={styles.feature}>✅ Check-in по GPS</Text>
        <Text style={styles.feature}>✅ Города, страны и очки</Text>
        <Text style={styles.feature}>✅ Профиль и достижения</Text>
        <Text style={styles.feature}>✅ Зоны посещений на карте</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#06182f",
    padding: 20,
    paddingTop: 60,
    paddingBottom: 120,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    color: "#9b5cff",
    fontSize: 32,
    fontWeight: "900",
  },
  gift: {
    fontSize: 28,
    backgroundColor: "#102b52",
    padding: 12,
    borderRadius: 18,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 42,
    lineHeight: 44,
  },
  heroEmoji: {
    fontSize: 78,
    textAlign: "center",
    marginVertical: 30,
  },
  welcomeCard: {
    backgroundColor: "#102b52",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },
  cardText: {
    color: "#b8c7dc",
    fontSize: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  mainButton: {
    backgroundColor: "#8b4dff",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  mainButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#102b52",
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
  },
  statIcon: {
    fontSize: 24,
  },
  statNumber: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 6,
  },
  statLabel: {
    color: "#b8c7dc",
    fontSize: 13,
  },
  section: {
    marginTop: 24,
    backgroundColor: "#102b52",
    borderRadius: 24,
    padding: 22,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 14,
  },
  feature: {
    color: "#dce8f7",
    fontSize: 17,
    marginBottom: 10,
  },
});
