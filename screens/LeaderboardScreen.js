import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function LeaderboardScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Daily Leaderboard</Text>
      <Text style={styles.subtitle}>Ежедневные соревнования Tourisk</Text>

      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Challenge of the Day</Text>
        <Text style={styles.heroTitle}>Пройди сегодня 8 км</Text>
        <Text style={styles.heroText}>Награда: +250 XP • +100 Coins</Text>
      </View>

      <View style={styles.youCard}>
        <Text style={styles.youTitle}>Ты сейчас</Text>
        <Text style={styles.youPoints}>120 XP</Text>
        <Text style={styles.youText}>1 страна • 1 город • Streak 1 день</Text>
      </View>

      <Text style={styles.sectionTitle}>Пешком сегодня</Text>

      <Leader place="1" name="Artur" result="23.8 км" reward="+300 XP" />
      <Leader place="2" name="Sofia" result="19.4 км" reward="+200 XP" />
      <Leader place="3" name="Alex" result="17.1 км" reward="+100 XP" />

      <Text style={styles.sectionTitle}>Исследователь дня</Text>

      <View style={styles.explorerCard}>
        <Text style={styles.explorerIcon}>KING</Text>
        <View>
          <Text style={styles.name}>Artur</Text>
          <Text style={styles.result}>18 новых территорий</Text>
          <Text style={styles.reward}>+400 XP • Rare Badge</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Велосипед</Text>

      <Leader place="1" name="Mike" result="42 км" reward="+250 XP" />
      <Leader place="2" name="Elena" result="36 км" reward="+150 XP" />

      <Text style={styles.footerText}>
        Завтра рейтинг обнулится, а победители получат бонусные очки.
      </Text>
    </ScrollView>
  );
}

function Leader({ place, name, result, reward }) {
  return (
    <View style={styles.row}>
      <Text style={styles.place}>#{place}</Text>

      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.result}>{result}</Text>
      </View>

      <Text style={styles.reward}>{reward}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#06182f",
    padding: 22,
    paddingTop: 70,
    paddingBottom: 120,
  },
  title: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
  },
  subtitle: {
    color: "#b8c7dc",
    fontSize: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  heroCard: {
    backgroundColor: "#f59e0b",
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
  },
  heroLabel: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
  },
  heroTitle: {
    color: "#111827",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 8,
  },
  heroText: {
    color: "#1f2937",
    fontSize: 15,
    marginTop: 8,
    fontWeight: "700",
  },
  youCard: {
    backgroundColor: "#102b52",
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
  },
  youTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
  },
  youPoints: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 8,
  },
  youText: {
    color: "#efe7ff",
    fontSize: 15,
    marginTop: 8,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 12,
  },
  row: {
    backgroundColor: "#102b52",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  place: {
    color: "#f59e0b",
    fontSize: 22,
    width: 54,
    fontWeight: "900",
  },
  info: {
    flex: 1,
  },
  name: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",

},
  result: {
    color: "#b8c7dc",
    fontSize: 15,
    marginTop: 4,
  },
  reward: {
    color: "#34d399",
    fontSize: 14,
    fontWeight: "900",
  },
  explorerCard: {
    backgroundColor: "#064e3b",
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  explorerIcon: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginRight: 16,
  },
  footerText: {
    color: "#b8c7dc",
    fontSize: 14,
    textAlign: "center",
    marginTop: 18,
  },
});
