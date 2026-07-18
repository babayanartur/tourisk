import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import WorldTravelMap from "./WorldTravelMap";

export default function TravelGeographyCard({ stats = {}, checkins = [], user = null }) {
  const geography = useMemo(() => buildGeography(stats, checkins, user), [checkins, stats, user]);

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <View style={styles.titleIcon}>
          <Ionicons name="earth" size={20} color="#b8f55b" />
        </View>
        <View style={styles.titleCopy}>
          <Text style={styles.title}>География путешествий</Text>
          <Text style={styles.subtitle}>Территория растёт с каждым настоящим шагом</Text>
        </View>
      </View>

      <View style={styles.mapWrap}>
        <WorldTravelMap checkins={checkins} style={styles.mapImage} />
        <View pointerEvents="none" style={styles.mapShade} />
        {geography.hasLocation ? (
          <View style={styles.mapLabel}>
            <Ionicons name="location" size={16} color="#b8f55b" />
            <View style={styles.mapLabelCopy}>
              <Text numberOfLines={1} style={styles.mapCity}>{geography.city}</Text>
              <Text numberOfLines={1} style={styles.mapCountry}>{geography.country}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyMapLabel}>
            <Ionicons name="navigate-outline" size={19} color="rgba(255,255,255,0.62)" />
            <Text style={styles.emptyMapText}>Первое место появится после GPS-открытия</Text>
          </View>
        )}
      </View>

      <View style={styles.countryCard}>
        <View style={styles.flagBox}>
          <Text style={styles.flag}>{geography.flag}</Text>
        </View>
        <View style={styles.countryCopy}>
          <Text style={styles.countryTitle}>Открытые страны</Text>
          <Text style={styles.countryCount}>{geography.countryCount} {plural(geography.countryCount, "страна", "страны", "стран")} · {geography.cityCount} {plural(geography.cityCount, "город", "города", "городов")}</Text>
          <Text numberOfLines={1} style={styles.countryMeta}>
            {geography.hasLocation
              ? `${geography.city} · ${formatArea(stats.exploredKm2)} открыто`
              : "Пока нет подтверждённых открытий"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={21} color="rgba(255,255,255,0.42)" />
      </View>

      <View style={styles.metrics}>
        <Metric icon="earth-outline" value={geography.countryCount} label="стран" />
        <Divider />
        <Metric icon="location-outline" value={geography.cityCount} label="городов" />
        <Divider />
        <Metric icon="footsteps-outline" value={formatDistance(stats.distanceKm)} label="путь" />
        <Divider />
        <Metric icon="sparkles-outline" value={formatArea(stats.exploredKm2, false)} label="км²" />
      </View>
    </View>
  );
}

function Metric({ icon, value, label }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={18} color="#b8f55b" />
      <Text numberOfLines={1} style={styles.metricValue}>{value}</Text>
      <Text numberOfLines={1} style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function buildGeography(stats, checkins, user) {
  const userCountries = Array.isArray(user?.countries) ? user.countries : [];
  const userCities = Array.isArray(user?.cities) ? user.cities : [];
  const checkinCountries = checkins.map((item) => item.country).filter(Boolean);
  const checkinCities = checkins.map((item) => item.title || item.city).filter(Boolean);
  const countries = unique([...userCountries, ...checkinCountries]);
  const cities = unique([...userCities, ...checkinCities]);
  const last = [...checkins].reverse().find((item) => item?.country || item?.title || item?.city);
  const country = normalizeCountry(last?.country || countries[countries.length - 1] || "");
  const city = last?.title || last?.city || cities[cities.length - 1] || "";

  return {
    countryCount: Math.max(Number(stats.countries || 0), countries.length),
    cityCount: Math.max(Number(stats.cities || 0), cities.length),
    country,
    city,
    flag: flagFor(country),
    hasLocation: Boolean(country || city),
  };
}

function unique(values) {
  return Array.from(new Set(values.map((item) => String(item || "").trim()).filter(Boolean)));
}

function normalizeCountry(value) {
  const raw = String(value || "").trim();
  const lower = raw.toLowerCase();
  if (["kyrgyzstan", "kyrgyz republic", "киргизия", "кыргызстан", "кыргызская республика"].includes(lower)) return "Кыргызстан";
  return raw;
}

function flagFor(country) {
  const value = String(country || "").toLowerCase();
  if (value.includes("кырг") || value.includes("kyrgyz")) return "🇰🇬";
  if (value.includes("арм")) return "🇦🇲";
  if (value.includes("груз")) return "🇬🇪";
  if (value.includes("каз")) return "🇰🇿";
  if (value.includes("рос")) return "🇷🇺";
  if (value.includes("тур")) return "🇹🇷";
  return "🌍";
}

function formatDistance(value) {
  const number = Number(value || 0);
  if (number < 1) return `${Math.round(number * 1000)} м`;
  return `${number.toFixed(number >= 10 ? 0 : 1)} км`;
}

function formatArea(value, withSuffix = true) {
  const number = Number(value || 0);
  const formatted = number < 1 ? number.toFixed(2) : number.toFixed(number >= 10 ? 0 : 1);
  return withSuffix ? `${formatted} км²` : formatted;
}

function plural(value, one, few, many) {
  const number = Math.abs(Number(value || 0));
  const lastTwo = number % 100;
  const last = number % 10;
  if (lastTwo >= 11 && lastTwo <= 19) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 27,
    padding: 14,
    backgroundColor: "rgba(3, 24, 23, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(183,239,92,0.13)",
    shadowColor: "#000",
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 2,
    marginBottom: 13,
  },
  titleIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(169,236,86,0.10)",
  },
  titleCopy: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 3,
    color: "rgba(255,255,255,0.48)",
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "700",
  },
  mapWrap: {
    height: 188,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#071718",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  mapImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  mapShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,12,13,0.10)",
  },
  mapLabel: {
    position: "absolute",
    right: 12,
    top: 12,
    maxWidth: "62%",
    minHeight: 45,
    paddingHorizontal: 11,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(2,22,20,0.88)",
    borderWidth: 1,
    borderColor: "rgba(185,244,91,0.22)",
  },
  mapLabelCopy: {
    flex: 1,
    marginLeft: 7,
  },
  mapCity: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
  },
  mapCountry: {
    marginTop: 2,
    color: "rgba(255,255,255,0.48)",
    fontSize: 8,
    fontWeight: "700",
  },
  emptyMapLabel: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(2,20,19,0.88)",
  },
  emptyMapText: {
    flex: 1,
    marginLeft: 8,
    color: "rgba(255,255,255,0.64)",
    fontSize: 9,
    fontWeight: "700",
  },
  countryCard: {
    marginTop: 11,
    minHeight: 82,
    paddingHorizontal: 12,
    borderRadius: 21,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(1,17,17,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  flagBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  flag: {
    fontSize: 28,
  },
  countryCopy: {
    flex: 1,
    marginLeft: 11,
    marginRight: 8,
  },
  countryTitle: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 10,
    fontWeight: "900",
  },
  countryCount: {
    marginTop: 4,
    color: "#b8f55b",
    fontSize: 12,
    fontWeight: "900",
  },
  countryMeta: {
    marginTop: 4,
    color: "rgba(255,255,255,0.47)",
    fontSize: 9,
    fontWeight: "700",
  },
  metrics: {
    minHeight: 76,
    marginTop: 11,
    borderRadius: 21,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(1,17,17,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  metric: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    marginTop: 3,
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  metricLabel: {
    marginTop: 1,
    color: "rgba(255,255,255,0.39)",
    fontSize: 7,
    fontWeight: "800",
  },
  divider: {
    width: 1,
    height: 38,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
});
