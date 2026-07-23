const apiUrl = String(process.env.EXPO_PUBLIC_API_URL || "https://back.tourisk.app/api").trim().replace(/\/$/, "");

export default {
  expo: {
    name: "Tourisk",
    slug: "tourisk-mobile",
    scheme: "tourisk",
    version: "1.8.6",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#020b0c",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "app.tourisk.mvp",
      buildNumber: "14",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "Tourisk использует геолокацию, чтобы открывать реальные территории на карте.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "Tourisk сохраняет пройденный путь и открытия, когда исследование активно.",
        UIBackgroundModes: ["location"],
      },
    },
    android: {
      package: "app.tourisk.mvp",
      versionCode: 14,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#020b0c",
      },
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
      ],
      config: process.env.GOOGLE_MAPS_API_KEY
        ? { googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY } }
        : undefined,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      ["expo-dev-client", { launchMode: "most-recent" }],
      "expo-font",
      [
        "expo-location",
        {
          locationWhenInUsePermission: "Разрешить Tourisk использовать геолокацию для открытия территорий.",
          locationAlwaysAndWhenInUsePermission: "Разрешить Tourisk сохранять маршрут во время исследования.",
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
        },
      ],
    ],
    extra: {
      apiUrl,
    },
  },
};
