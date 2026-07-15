export const hiddenDiscoveries = {
  levonCave: {
    id: "levon-cave",

    title: "Пещера Левона",

    description:
      "Более двадцати лет один человек вручную создавал этот подземный лабиринт в базальте.",

    rarityLabel: "HIDDEN DISCOVERY",

    xp: 120,

    city: "Ариндж",

    collectionName: "Hidden Discoveries",

    collectionCurrent: 1,

    collectionTotal: 3,

    image: require("../assets/discoveries/hidden/levon-cave-tourisk-art.png"),
  },
};

export function getHiddenDiscoveryById(id) {
  return (
    Object.values(hiddenDiscoveries).find(
      discovery => discovery.id === id
    ) ?? null
  );
}