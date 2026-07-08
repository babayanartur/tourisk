import AsyncStorage from "@react-native-async-storage/async-storage";

export async function getPlayerStats() {
  const saved = await AsyncStorage.getItem("checkins");
  const checkins = saved ? JSON.parse(saved) : [];

  const uniqueCheckins = checkins.filter((item, index, array) => {
    const city = (item.title || item.city || "").toLowerCase();

    return index === array.findIndex((x) => {
      const xCity = (x.title || x.city || "").toLowerCase();
      return xCity === city;
    });
  });

  const cities = uniqueCheckins.length;
  const countries = [...new Set(uniqueCheckins.map((c) => c.country))].length;

  const xp = Math.max(cities * 120, 0);
  const coins = Math.max(cities * 45, 0);

  const territories = Math.max(cities * 52, 0);
  const achievements = cities > 0 ? 1 : 0;

  return {
    checkins,
    uniqueCheckins,
    cities,
    countries,
    xp,
    coins,
    territories,
    achievements,
  };
}