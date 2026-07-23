import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { requestEmailCode, verifyEmailCode } from "../services/authService";
import LegalDocumentScreen from "./LegalDocumentScreen";
import LivingWorld from "../components/LivingWorld";

const authBg = require("../assets/backgrounds/home-world-feedback.jpg");

export default function AuthScreen({ onAuth }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [legalType, setLegalType] = useState(null);
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(28)).current;

  const cleanEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.spring(cardY, { toValue: 0, friction: 8, tension: 58, useNativeDriver: true }),
    ]).start();

  }, [cardOpacity, cardY]);


  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = setInterval(() => {
      setResendSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  const requirePolicy = () => {
    if (policyAccepted) return true;
    Alert.alert("Документы", "Примите политику конфиденциальности и пользовательское соглашение.");
    return false;
  };

  const sendCode = async () => {
    if (!requirePolicy()) return;
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      Alert.alert("Почта", "Введите корректный адрес электронной почты.");
      return;
    }

    setLoading(true);
    try {
      const result = await requestEmailCode(cleanEmail);
      setCodeSent(true);
      setCode("");
      setResendSeconds(60);
      Alert.alert("Код отправлен", result?.message || "Проверьте почту. Код действует 10 минут.");
    } catch (error) {
      Alert.alert("Ошибка", error.message || "Не удалось отправить код.");
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async () => {
    if (!requirePolicy()) return;
    if (!/^\d{6}$/.test(code.trim())) {
      Alert.alert("Код", "Введите шесть цифр из письма.");
      return;
    }

    setLoading(true);
    try {
      const user = await verifyEmailCode(cleanEmail, code);
      onAuth(user);
    } catch (error) {
      Alert.alert("Вход", error.message || "Не удалось войти.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <View style={styles.root}>
      <LivingWorld
        source={authBg}
        fogOpacity={0.38}
        windOpacity={0.24}
        scrim="rgba(0, 8, 11, 0.24)"
        bottomShade="rgba(0, 12, 12, 0.52)"
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 38, paddingBottom: Math.max(insets.bottom, 18) + 18 }]}
        >
          <View style={styles.brandBlock}>
            <Text style={styles.brand}>TOURISK</Text>
            <View style={styles.brandLineRow}>
              <View style={styles.brandLine} />
              <Text style={styles.brandDiamond}>◇</Text>
              <View style={styles.brandLine} />
            </View>
            <Text style={styles.brandCaption}>ИССЛЕДУЙ РЕАЛЬНЫЙ МИР</Text>
          </View>

          <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardY }] }]}> 
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="compass-outline" size={26} color="#a9ec56" />
            </View>
            <Text style={styles.title}>Вход исследователя</Text>
            <Text style={styles.text}>Сохрани прогресс, открытия и место в рейтинге.</Text>

            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.54)" />
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                placeholder="email@tourisk.app"
                placeholderTextColor="rgba(255,255,255,0.34)"
                style={styles.input}
              />
            </View>

            {codeSent && (
              <View style={styles.inputWrap}>
                <Ionicons name="keypad-outline" size={20} color="rgba(255,255,255,0.54)" />
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="Код из письма"
                  placeholderTextColor="rgba(255,255,255,0.34)"
                  style={styles.input}
                />
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.primaryButton, loading && styles.disabled]}
              disabled={loading}
              onPress={codeSent ? confirmCode : sendCode}
            >
              {loading ? (
                <ActivityIndicator color="#07140d" />
              ) : (
                <>
                  <Text style={styles.primaryText}>{codeSent ? "Войти" : "Получить код"}</Text>
                  <Ionicons name="arrow-forward" size={20} color="#07140d" />
                </>
              )}
            </TouchableOpacity>

            {codeSent && (
              <View style={styles.codeActions}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.changeEmailButton}
                  onPress={() => { setCodeSent(false); setCode(""); setResendSeconds(0); }}
                >
                  <Text style={styles.changeEmailText}>Изменить почту</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.changeEmailButton}
                  disabled={loading || resendSeconds > 0}
                  onPress={sendCode}
                >
                  <Text style={[styles.changeEmailText, resendSeconds > 0 && styles.resendDisabled]}>
                    {resendSeconds > 0 ? `Повторно через ${resendSeconds} с` : "Отправить ещё раз"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}


            <TouchableOpacity activeOpacity={0.85} style={styles.policyRow} onPress={() => setPolicyAccepted((value) => !value)}>
              <View style={[styles.checkbox, policyAccepted && styles.checkboxActive]}>
                {policyAccepted ? <Ionicons name="checkmark" size={17} color="#07140d" /> : null}
              </View>
              <Text style={styles.policyText}>Я принимаю условия использования Tourisk.</Text>
            </TouchableOpacity>

            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={() => setLegalType("privacy")}>
                <Text style={styles.legalLink}>Политика конфиденциальности</Text>
              </TouchableOpacity>
              <Text style={styles.legalDot}>•</Text>
              <TouchableOpacity onPress={() => setLegalType("terms")}>
                <Text style={styles.legalLink}>Соглашение</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={Boolean(legalType)} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setLegalType(null)}>
        <LegalDocumentScreen type={legalType || "privacy"} onClose={() => setLegalType(null)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020b0c" },
  flex: { flex: 1 },
  backgroundImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  topScrim: { position: "absolute", left: 0, right: 0, top: 0, height: "36%", backgroundColor: "rgba(0,7,12,0.18)" },
  bottomScrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "66%", backgroundColor: "rgba(0,12,12,0.48)" },
  glowOne: { position: "absolute", top: 150, left: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(96,182,255,0.08)" },
  glowTwo: { position: "absolute", bottom: 120, right: -90, width: 250, height: 250, borderRadius: 125, backgroundColor: "rgba(169,236,86,0.08)" },
  scrollContent: { flexGrow: 1, justifyContent: "space-between", paddingHorizontal: 18 },
  brandBlock: { alignItems: "center", paddingTop: 6, paddingBottom: 34 },
  brand: { color: "#fff", fontSize: 29, letterSpacing: 10, fontWeight: "300", textShadowColor: "rgba(255,255,255,0.48)", textShadowRadius: 13 },
  brandLineRow: { marginTop: 13, flexDirection: "row", alignItems: "center", gap: 13 },
  brandLine: { width: 54, height: 1, backgroundColor: "rgba(255,255,255,0.30)" },
  brandDiamond: { color: "rgba(255,255,255,0.74)", fontSize: 16 },
  brandCaption: { marginTop: 12, color: "rgba(255,255,255,0.56)", fontSize: 10, fontWeight: "900", letterSpacing: 2.2 },
  card: {
    width: "100%",
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 20,
    backgroundColor: "rgba(3, 23, 22, 0.90)",
    borderWidth: 1,
    borderColor: "rgba(169,236,86,0.20)",
    shadowColor: "#000",
    shadowOpacity: 0.52,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 20,
  },
  cardHeaderIcon: { position: "absolute", top: -24, alignSelf: "center", width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: "#08251b", borderWidth: 1, borderColor: "rgba(169,236,86,0.35)", shadowColor: "#a9ec56", shadowOpacity: 0.28, shadowRadius: 16 },
  title: { marginTop: 8, color: "#fff", fontSize: 29, lineHeight: 34, fontWeight: "900", textAlign: "center", letterSpacing: -0.7 },
  text: { marginTop: 8, marginBottom: 18, color: "rgba(255,255,255,0.62)", fontSize: 14, lineHeight: 20, fontWeight: "700", textAlign: "center" },
  inputWrap: { height: 56, marginTop: 10, paddingHorizontal: 15, borderRadius: 18, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.11)" },
  input: { flex: 1, height: "100%", marginLeft: 10, color: "#fff", fontSize: 16, fontWeight: "800" },
  primaryButton: { marginTop: 13, height: 58, borderRadius: 19, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#a9ec56", shadowColor: "#a9ec56", shadowOpacity: 0.26, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  primaryText: { color: "#07140d", fontSize: 17, fontWeight: "900" },
  disabled: { opacity: 0.62 },
  codeActions: { marginTop: 12, gap: 10, alignItems: "center" },
  resendDisabled: { opacity: 0.45 },
  changeEmailButton: { alignSelf: "center", paddingVertical: 9, paddingHorizontal: 12 },
  changeEmailText: { color: "rgba(255,255,255,0.56)", fontSize: 12, fontWeight: "800" },
  separator: { marginVertical: 17, flexDirection: "row", alignItems: "center" },
  line: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.10)" },
  separatorText: { marginHorizontal: 10, color: "rgba(255,255,255,0.42)", fontSize: 11, fontWeight: "800" },
  providerRow: { flexDirection: "row", gap: 10 },
  providerButton: { flex: 1, height: 54, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.11)" },
  providerText: { color: "#fff", fontSize: 15, fontWeight: "900" },
  googleMark: { color: "#fff", fontSize: 20, fontWeight: "900" },
  policyRow: { marginTop: 17, flexDirection: "row", alignItems: "center" },
  checkbox: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.30)", backgroundColor: "rgba(255,255,255,0.04)" },
  checkboxActive: { backgroundColor: "#a9ec56", borderColor: "#a9ec56" },
  policyText: { flex: 1, marginLeft: 10, color: "rgba(255,255,255,0.66)", fontSize: 12, lineHeight: 17, fontWeight: "700" },
  legalLinks: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 7 },
  legalLink: { color: "#b9ed75", fontSize: 11, fontWeight: "800", textDecorationLine: "underline" },
  legalDot: { color: "rgba(255,255,255,0.28)", fontSize: 11 },
});
