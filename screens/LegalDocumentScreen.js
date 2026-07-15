import React from "react";
import { ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const background = require("../assets/backgrounds/profile-world.jpg");

const DOCUMENTS = {
  privacy: {
    title: "Политика конфиденциальности",
    updatedAt: "Редакция от 11 июля 2026 года",
    sections: [
      [
        "1. Какие данные использует Tourisk",
        "Для работы приложения могут использоваться адрес электронной почты, никнейм, выбранная фигурка, игровой прогресс, достижения и данные геолокации. Геолокация обрабатывается только после разрешения пользователя и нужна для открытия территорий, check-in и построения истории путешествий.",
      ],
      [
        "2. Для чего нужны данные",
        "Данные используются для входа в аккаунт, сохранения прогресса, отображения рейтинга, работы карты, начисления XP, защиты аккаунта и улучшения стабильности приложения.",
      ],
      [
        "3. Передача данных",
        "Tourisk не продаёт персональные данные. Передача техническим подрядчикам допускается только в объёме, необходимом для работы хостинга, авторизации, аналитики и доставки уведомлений.",
      ],
      [
        "4. Хранение и защита",
        "Данные хранятся столько, сколько необходимо для работы аккаунта и выполнения требований закона. Для защиты применяются разграничение доступа, авторизация и технические меры безопасности.",
      ],
      [
        "5. Права пользователя",
        "Пользователь может изменить никнейм, выйти из аккаунта, отозвать разрешение на геолокацию в настройках устройства и запросить удаление аккаунта у администратора сервиса.",
      ],
      [
        "6. Изменения политики",
        "Политика может обновляться вместе с развитием Tourisk. Новая редакция публикуется в приложении и действует с даты публикации.",
      ],
    ],
  },
  terms: {
    title: "Пользовательское соглашение",
    updatedAt: "Редакция от 11 июля 2026 года",
    sections: [
      [
        "1. Назначение приложения",
        "Tourisk — игровая платформа для исследования реального мира. Пользователь открывает территории, выполняет check-in, получает XP, достижения и участвует в рейтингах.",
      ],
      [
        "2. Аккаунт",
        "Пользователь отвечает за достоверность данных аккаунта и безопасность доступа к нему. Запрещено передавать аккаунт для обхода правил, накрутки прогресса или вмешательства в работу сервиса.",
      ],
      [
        "3. Геолокация и безопасность",
        "Используя карту, пользователь обязан соблюдать законы, правила дорожного движения, ограничения доступа к территориям и требования личной безопасности. Tourisk не призывает заходить в опасные или закрытые места.",
      ],
      [
        "4. Игровой прогресс",
        "XP, достижения, фигурки и рейтинг являются элементами приложения и не имеют денежной стоимости, если отдельно не указано иное. Администрация вправе исправлять ошибочно начисленный прогресс и пресекать накрутку.",
      ],
      [
        "5. Запрещённые действия",
        "Запрещены взлом, автоматизированная накрутка, подмена геолокации, публикация незаконного контента, создание помех другим пользователям и попытки получить доступ к чужим данным.",
      ],
      [
        "6. Работа сервиса",
        "Приложение развивается и может временно быть недоступно из-за обновлений, технических работ или внешних ограничений. Администрация старается сохранять прогресс, но не гарантирует абсолютную бесперебойность.",
      ],
      [
        "7. Прекращение доступа",
        "Аккаунт может быть ограничен или заблокирован при нарушении соглашения, попытках мошенничества, угрозах безопасности сервиса или другим пользователям.",
      ],
    ],
  },
};

export default function LegalDocumentScreen({ type = "privacy", onClose }) {
  const insets = useSafeAreaInsets();
  const document = DOCUMENTS[type] || DOCUMENTS.privacy;

  return (
    <ImageBackground source={background} style={styles.background} resizeMode="cover">
      <View style={styles.scrim} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}> 
        <TouchableOpacity accessibilityRole="button" activeOpacity={0.82} style={styles.backButton} onPress={onClose}>
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text numberOfLines={1} style={styles.headerTitle}>{document.title}</Text>
          <Text style={styles.headerDate}>{document.updatedAt}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 30 }]}
      >
        <View style={styles.introCard}>
          <Ionicons name={type === "privacy" ? "shield-checkmark" : "document-text"} size={24} color="#a9ec56" />
          <Text style={styles.introText}>
            Краткая редакция для мобильного приложения Tourisk. Здесь без километров юридической ваты, но с понятными правилами.
          </Text>
        </View>

        {document.sections.map(([title, body]) => (
          <View key={title} style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionBody}>{body}</Text>
          </View>
        ))}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: "#03100e" },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 10, 12, 0.36)" },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(2, 17, 17, 0.82)",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  headerText: { flex: 1, marginLeft: 12 },
  headerTitle: { color: "#fff", fontSize: 19, fontWeight: "900" },
  headerDate: { marginTop: 3, color: "rgba(255,255,255,0.54)", fontSize: 12, fontWeight: "700" },
  content: { padding: 16 },
  introCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 22,
    backgroundColor: "rgba(8, 31, 26, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(169,236,86,0.18)",
    marginBottom: 12,
  },
  introText: { flex: 1, color: "rgba(255,255,255,0.78)", fontSize: 14, lineHeight: 21, fontWeight: "700" },
  section: {
    padding: 18,
    marginTop: 12,
    borderRadius: 22,
    backgroundColor: "rgba(4, 23, 23, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  sectionTitle: { color: "#f4d48b", fontSize: 17, lineHeight: 22, fontWeight: "900" },
  sectionBody: { marginTop: 9, color: "rgba(255,255,255,0.72)", fontSize: 14, lineHeight: 22, fontWeight: "600" },
});
