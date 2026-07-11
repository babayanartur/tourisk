export const discoveries = {
  cascade: {
    id: "cascade",
    title: "Каскад",
    description:
      "Монументальная лестница, соединяющая центр Еревана с вершиной города.",
    rarityLabel: "ЛЕГЕНДАРНОЕ ОТКРЫТИЕ",
    xp: 60,
    city: "Еревана",
    collectionName: "Легендарные открытия",
    collectionCurrent: 1,
    collectionTotal: 20,
    image: require("../assets/discoveries/cascade-tourisk-art.png"),
  },

  opera: {
    id: "opera",
    title: "Опера",
    description:
      "Культурное сердце Еревана, где музыка, архитектура и вечерний город встречаются в одном месте.",
    rarityLabel: "ЛЕГЕНДАРНОЕ ОТКРЫТИЕ",
    xp: 50,
    city: "Еревана",
    collectionName: "Легендарные открытия",
    collectionCurrent: 2,
    collectionTotal: 20,
    image: require("../assets/discoveries/opera-tourisk-art.png"),
  },

  republicSquare: {
    id: "republic-square",
    title: "Площадь Республики",
    description:
      "Главная площадь Еревана, окружённая монументальной архитектурой из розового туфа.",
    rarityLabel: "ЛЕГЕНДАРНОЕ ОТКРЫТИЕ",
    xp: 60,
    city: "Еревана",
    collectionName: "Легендарные открытия",
    collectionCurrent: 3,
    collectionTotal: 20,
    image: require("../assets/discoveries/republic-square-tourisk-art.png"),
  },

  matenadaran: {
    id: "matenadaran",
    title: "Матенадаран",
    description:
      "Хранилище древних рукописей и одно из важнейших культурных мест Армении.",
    rarityLabel: "ЛЕГЕНДАРНОЕ ОТКРЫТИЕ",
    xp: 60,
    city: "Еревана",
    collectionName: "Легендарные открытия",
    collectionCurrent: 4,
    collectionTotal: 20,
    image: require("../assets/discoveries/matenadaran-tourisk-art.png"),
  },

  vernissage: {
    id: "vernissage",
    title: "Вернисаж",
    description:
      "Открытый рынок искусства, ремёсел и армянских сувениров в центре Еревана.",
    rarityLabel: "ЛЕГЕНДАРНОЕ ОТКРЫТИЕ",
    xp: 45,
    city: "Еревана",
    collectionName: "Легендарные открытия",
    collectionCurrent: 5,
    collectionTotal: 20,
    image: require("../assets/discoveries/vernissage-tourisk-art.png"),
  },

  blueMosque: {
    id: "blue-mosque",
    title: "Голубая мечеть",
    description:
      "Тихий исторический комплекс с бирюзовыми куполами и внутренним садом.",
    rarityLabel: "ЛЕГЕНДАРНОЕ ОТКРЫТИЕ",
    xp: 55,
    city: "Еревана",
    collectionName: "Легендарные открытия",
    collectionCurrent: 6,
    collectionTotal: 20,
    image: require("../assets/discoveries/blue-mosque-tourisk-art.png"),
  },

  victoryPark: {
    id: "victory-park",
    title: "Парк Победы",
    description:
      "Парк над городом с панорамой Еревана и монументом Матери Армении.",
    rarityLabel: "ЛЕГЕНДАРНОЕ ОТКРЫТИЕ",
    xp: 55,
    city: "Еревана",
    collectionName: "Легендарные открытия",
    collectionCurrent: 7,
    collectionTotal: 20,
    image: require("../assets/discoveries/victory-park-tourisk-art.png"),
  },

  loversPark: {
    id: "lovers-park",
    title: "Парк влюблённых",
    description:
      "Спокойный городской парк с небольшими мостами, водой и зелёными аллеями.",
    rarityLabel: "ЛЕГЕНДАРНОЕ ОТКРЫТИЕ",
    xp: 40,
    city: "Еревана",
    collectionName: "Легендарные открытия",
    collectionCurrent: 8,
    collectionTotal: 20,
    image: require("../assets/discoveries/lovers-park-tourisk-art.png"),
  },

  tsitsernakaberd: {
    id: "tsitsernakaberd",
    title: "Цицернакаберд",
    description:
      "Мемориальный комплекс, посвящённый памяти жертв Геноцида армян.",
    rarityLabel: "ЛЕГЕНДАРНОЕ ОТКРЫТИЕ",
    xp: 70,
    city: "Еревана",
    collectionName: "Легендарные открытия",
    collectionCurrent: 9,
    collectionTotal: 20,
    image: require("../assets/discoveries/tsitsernakaberd-tourisk-art.png"),
  },

  saryanStreet: {
    id: "saryan-street",
    title: "Улица Сарьяна",
    description:
      "Атмосферная улица с галереями, винными барами и вечерней жизнью.",
    rarityLabel: "ЛЕГЕНДАРНОЕ ОТКРЫТИЕ",
    xp: 45,
    city: "Еревана",
    collectionName: "Легендарные открытия",
    collectionCurrent: 10,
    collectionTotal: 20,
    image: require("../assets/discoveries/saryan-street-tourisk-art.png"),
  },

  motherArmenia: {
    id: "mother-armenia",
    title: "Мать Армения",
    description:
      "Монументальный символ силы и защиты, возвышающийся над Ереваном.",
    rarityLabel: "ЛЕГЕНДАРНОЕ ОТКРЫТИЕ",
    xp: 65,
    city: "Еревана",
    collectionName: "Легендарные открытия",
    collectionCurrent: 11,
    collectionTotal: 20,
    image: require("../assets/discoveries/mother-armenia-tourisk-art.png"),
  },
};

export function getDiscoveryById(id) {
  return Object.values(discoveries).find(
    (discovery) => discovery.id === id
  ) ?? null;
}