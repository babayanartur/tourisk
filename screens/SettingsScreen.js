import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { logout, updateProfile } from "../services/authService";
import { getLocalPawnFallback, getSelectedPawn, getSelectedPawnSource } from "../services/assetResolver";
import LivingWorld from "../components/LivingWorld";
import ResilientImage from "../components/ResilientImage";
import LegalDocumentScreen from "./LegalDocumentScreen";

const background = require("../assets/backgrounds/profile-world.jpg");
const SETTINGS_KEYS = {
  notifications: "tourisk:settings:notifications",
  sounds: "tourisk:settings:sounds",
};

export default function SettingsScreen({ initialUser, pawns = [], onClose, onUserUpdated, onLogout }) {
  const insets = useSafeAreaInsets();
  const [nickname, setNickname] = useState(initialUser?.nickname || "Explorer");
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [sounds, setSounds] = useState(true);
  const [legalType, setLegalType] = useState(null);

  useEffect(() => {
    setNickname(initialUser?.nickname || "Explorer");
  }, [initialUser?.nickname]);

  useEffect(() => {
    AsyncStorage.multiGet([SETTINGS_KEYS.notifications, SETTINGS_KEYS.sounds]).then((entries) => {
      const values = Object.fromEntries(entries);
      if (values[SETTINGS_KEYS.notifications] !== null) setNotifications(values[SETTINGS_KEYS.notifications] !== "0");
      if (values[SETTINGS_KEYS.sounds] !== null) setSounds(values[SETTINGS_KEYS.sounds] !== "0");
    }).catch(() => {});
  }, []);

  const saveNickname = async () => {
    const clean = nickname.trim();
    if (clean.length < 2) {
      Alert.alert("Никнейм", "Введите минимум 2 символа.");
      return;
    }
    if (clean.length > 24) {
      Alert.alert("Никнейм", "Максимальная длина никнейма — 24 символа.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateProfile({ nickname: clean });
      onUserUpdated?.(updated);
      onClose?.();
    } catch (error) {
      Alert.alert("Ошибка", error.message || "Не удалось сохранить профиль.");
    } finally {
      setSaving(false);
    }
  };

  const setPreference = async (key, value, setter) => {
    setter(value);
    await AsyncStorage.setItem(key, value ? "1" : "0");
  };

  const requestLogout = () => {
    Alert.alert("Выйти из аккаунта?", "Игровой прогресс останется привязан к аккаунту.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Выйти",
        style: "destructive",
        onPress: async () => {
          await logout();
          onLogout?.();
        },
      },
    ]);
  };

  const selectedPawn = getSelectedPawn(pawns, initialUser?.selectedPawn);

  return (
    <View style={styles.background}>
      <LivingWorld source={background} fogOpacity={0.34} windOpacity={0.22} scrim="rgba(0, 9, 11, 0.38)" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}> 
        <TouchableOpacity accessibilityRole="button" activeOpacity={0.82} style={styles.backButton} onPress={onClose}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Настройки</Text>
          <Text style={styles.headerSubtitle}>Аккаунт, интерфейс и документы</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 32 }]}
      >
        <View style={styles.accountCard}>
          <View style={styles.avatarWrap}>
            <ResilientImage
              source={getSelectedPawnSource(pawns, initialUser?.selectedPawn)}
              fallbackSource={getLocalPawnFallback(selectedPawn)}
              fallbackElement={<Text style={styles.avatarFallback}>♟</Text>}
              style={styles.avatar}
              resizeMode="contain"
            />
          </View>
          <View style={styles.accountBody}>
            <Text numberOfLines={1} style={styles.accountName}>{initialUser?.nickname || "Explorer"}</Text>
            <Text numberOfLines={1} style={styles.accountEmail}>{initialUser?.email || "Tourisk account"}</Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelValue}>{initialUser?.level || 1}</Text>
            <Text style={styles.levelLabel}>ур.</Text>
          </View>
        </View>

        <SectionTitle title="Профиль" />
        <View style={styles.panel}>
          <Text style={styles.inputLabel}>Никнейм исследователя</Text>
          <TextInput
            value={nickname}
            onChangeText={setNickname}
            maxLength={24}
            placeholder="Explorer"
            placeholderTextColor="rgba(255,255,255,0.34)"
            style={styles.input}
          />
          <TouchableOpacity activeOpacity={0.88} disabled={saving} style={[styles.saveButton, saving && styles.disabled]} onPress={saveNickname}>
            {saving ? <ActivityIndicator color="#06120d" /> : <Text style={styles.saveText}>Сохранить изменения</Text>}
          </TouchableOpacity>
        </View>

        <SectionTitle title="Приложение" />
        <View style={styles.panelNoPadding}>
          <SettingSwitch
            icon="notifications-outline"
            title="Уведомления об открытиях"
            subtitle="XP, достижения и новые территории"
            value={notifications}
            onValueChange={(value) => setPreference(SETTINGS_KEYS.notifications, value, setNotifications)}
          />
          <SettingSwitch
            icon="volume-medium-outline"
            title="Звуки интерфейса"
            subtitle="Короткие звуки действий и наград"
            value={sounds}
            onValueChange={(value) => setPreference(SETTINGS_KEYS.sounds, value, setSounds)}
            last
          />
        </View>

        <SectionTitle title="Документы" />
        <View style={styles.panelNoPadding}>
          <SettingRow icon="shield-checkmark-outline" title="Политика конфиденциальности" onPress={() => setLegalType("privacy")} />
          <SettingRow icon="document-text-outline" title="Пользовательское соглашение" onPress={() => setLegalType("terms")} last />
        </View>

        <SectionTitle title="Сессия" />
        <TouchableOpacity activeOpacity={0.86} style={styles.logoutButton} onPress={requestLogout}>
          <Ionicons name="log-out-outline" size={22} color="#ffb4b4" />
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </TouchableOpacity>

        <Text style={styles.version}>TOURISK · 1.2.1</Text>
      </ScrollView>

      <Modal visible={Boolean(legalType)} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setLegalType(null)}>
        <LegalDocumentScreen type={legalType || "privacy"} onClose={() => setLegalType(null)} />
      </Modal>
    </View>
  );
}

function SectionTitle({ title }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function SettingRow({ icon, title, onPress, last = false }) {
  return (
    <TouchableOpacity activeOpacity={0.82} style={[styles.settingRow, last && styles.lastRow]} onPress={onPress}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={21} color="#b7ee59" />
      </View>
      <Text style={styles.settingTitle}>{title}</Text>
      <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.34)" />
    </TouchableOpacity>
  );
}

function SettingSwitch({ icon, title, subtitle, value, onValueChange, last = false }) {
  return (
    <View style={[styles.settingRow, last && styles.lastRow]}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={21} color="#b7ee59" />
      </View>
      <View style={styles.switchCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "rgba(255,255,255,0.16)", true: "rgba(183,238,89,0.42)" }}
        thumbColor={value ? "#b7ee59" : "#d5d8d5"}
        ios_backgroundColor="rgba(255,255,255,0.16)"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: "#03100e" },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(3, 18, 18, 0.91)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
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
  headerCopy: { marginLeft: 12 },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "900" },
  headerSubtitle: { marginTop: 2, color: "rgba(255,255,255,0.52)", fontSize: 12, fontWeight: "700" },
  content: { paddingHorizontal: 16, paddingTop: 18 },
  accountCard: {
    minHeight: 96,
    padding: 14,
    borderRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(5, 29, 25, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(169,236,86,0.16)",
    shadowColor: "#000",
    shadowOpacity: 0.32,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
  },
  avatarWrap: {
    width: 66,
    height: 66,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(169,236,86,0.10)",
    borderWidth: 1,
    borderColor: "rgba(169,236,86,0.22)",
  },
  avatarFallback: { color: "#b7ee59", fontSize: 42, fontWeight: "700" },
  avatar: { width: 58, height: 58, resizeMode: "contain" },
  accountBody: { flex: 1, marginLeft: 13 },
  accountName: { color: "#fff", fontSize: 20, fontWeight: "900" },
  accountEmail: { marginTop: 5, color: "rgba(255,255,255,0.52)", fontSize: 13, fontWeight: "700" },
  levelBadge: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(244,196,81,0.12)", borderWidth: 1, borderColor: "rgba(244,196,81,0.22)" },
  levelValue: { color: "#f4d48b", fontSize: 20, fontWeight: "900" },
  levelLabel: { color: "rgba(255,255,255,0.48)", fontSize: 10, fontWeight: "800" },
  sectionTitle: { marginTop: 24, marginBottom: 9, marginLeft: 4, color: "rgba(255,255,255,0.58)", fontSize: 12, fontWeight: "900", letterSpacing: 1.2, textTransform: "uppercase" },
  panel: { padding: 15, borderRadius: 24, backgroundColor: "rgba(4, 25, 24, 0.90)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  panelNoPadding: { overflow: "hidden", borderRadius: 24, backgroundColor: "rgba(4, 25, 24, 0.90)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  inputLabel: { color: "rgba(255,255,255,0.70)", fontSize: 13, fontWeight: "800", marginBottom: 8 },
  input: { height: 54, borderRadius: 17, paddingHorizontal: 15, color: "#fff", fontSize: 17, fontWeight: "800", backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  saveButton: { marginTop: 11, height: 52, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#b7ee59" },
  saveText: { color: "#06120d", fontSize: 16, fontWeight: "900" },
  disabled: { opacity: 0.64 },
  settingRow: { minHeight: 70, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  lastRow: { borderBottomWidth: 0 },
  settingIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(169,236,86,0.09)" },
  settingTitle: { flex: 1, marginLeft: 12, color: "#fff", fontSize: 15, fontWeight: "800" },
  settingSubtitle: { marginLeft: 12, marginTop: 3, color: "rgba(255,255,255,0.46)", fontSize: 11, fontWeight: "700" },
  switchCopy: { flex: 1 },
  logoutButton: { height: 58, borderRadius: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: "rgba(255,74,74,0.12)", borderWidth: 1, borderColor: "rgba(255,107,107,0.22)" },
  logoutText: { color: "#ffb4b4", fontSize: 16, fontWeight: "900" },
  version: { marginTop: 24, textAlign: "center", color: "rgba(255,255,255,0.32)", fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
});
