import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { loginWithProvider, requestEmailCode, verifyEmailCode } from "../services/authService";

const heroBg = require("../brand/hero/hero-v1.png");

export default function AuthScreen({ onAuth }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const cleanEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const requirePolicy = () => {
    if (policyAccepted) return true;
    Alert.alert("Оферта и политика", "Сначала прими политику и оферту. Да, бюрократия победила романтику.");
    return false;
  };

  const sendCode = async () => {
    if (!requirePolicy()) return;
    if (!cleanEmail.includes("@")) {
      Alert.alert("Почта", "Введи нормальную почту. Символ @ всё ещё нужен, человечество держится на мелочах.");
      return;
    }

    setLoading(true);
    try {
      await requestEmailCode(cleanEmail);
      setCodeSent(true);
      Alert.alert("Код отправлен", "На этапе тестировки код входа: 1111");
    } catch (error) {
      Alert.alert("Ошибка", error.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async () => {
    if (!requirePolicy()) return;
    setLoading(true);
    try {
      const user = await verifyEmailCode(cleanEmail, code);
      onAuth(user);
    } catch (error) {
      Alert.alert("Вход", error.message);
    } finally {
      setLoading(false);
    }
  };

  const providerLogin = async (provider) => {
    if (!requirePolicy()) return;
    setLoading(true);
    try {
      const user = await loginWithProvider(provider);
      onAuth(user);
    } catch (error) {
      Alert.alert("Вход", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={heroBg} resizeMode="cover" style={styles.bg}>
      <View style={styles.scrim} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.card}>
          <Text style={styles.logo}>TOURISK</Text>
          <Text style={styles.title}>Вход исследователя</Text>
          <Text style={styles.text}>Почта, Apple или Google. Для теста код всегда 1111.</Text>

          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="email@tourisk.app"
            placeholderTextColor="rgba(255,255,255,0.42)"
            style={styles.input}
          />

          {codeSent && (
            <TextInput
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="1111"
              placeholderTextColor="rgba(255,255,255,0.42)"
              style={styles.input}
            />
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
              <Text style={styles.primaryText}>{codeSent ? "Войти" : "Получить код"}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.separator}>
            <View style={styles.line} />
            <Text style={styles.separatorText}>или</Text>
            <View style={styles.line} />
          </View>

          <TouchableOpacity activeOpacity={0.85} style={styles.providerButton} onPress={() => providerLogin("apple")}>
            <Text style={styles.providerText}> Войти через Apple</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.85} style={styles.providerButton} onPress={() => providerLogin("google")}>
            <Text style={styles.providerText}>G Войти через Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.policyRow}
            onPress={() => setPolicyAccepted((value) => !value)}
          >
            <View style={[styles.checkbox, policyAccepted && styles.checkboxActive]}>
              <Text style={styles.checkmark}>{policyAccepted ? "✓" : ""}</Text>
            </View>
            <Text style={styles.policyText}>Я принимаю политику конфиденциальности и публичную оферту.</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "#04120d",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 8, 12, 0.62)",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
  },
  card: {
    borderRadius: 34,
    padding: 22,
    backgroundColor: "rgba(5, 20, 18, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(183, 226, 89, 0.28)",
  },
  logo: {
    color: "#dff8a0",
    fontSize: 22,
    letterSpacing: 7,
    fontWeight: "300",
    textAlign: "center",
  },
  title: {
    marginTop: 18,
    color: "#fff",
    fontSize: 31,
    fontWeight: "900",
    textAlign: "center",
  },
  text: {
    marginTop: 10,
    marginBottom: 18,
    color: "rgba(255,255,255,0.72)",
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    fontWeight: "600",
  },
  input: {
    height: 54,
    borderRadius: 18,
    paddingHorizontal: 16,
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  primaryButton: {
    marginTop: 14,
    height: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#a8d85a",
  },
  disabled: {
    opacity: 0.7,
  },
  primaryText: {
    color: "#07140d",
    fontSize: 17,
    fontWeight: "900",
  },
  separator: {
    marginVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  separatorText: {
    color: "rgba(255,255,255,0.52)",
    fontWeight: "800",
  },
  providerButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  providerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  policyRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: "#a8d85a",
    borderColor: "#a8d85a",
  },
  checkmark: {
    color: "#07140d",
    fontWeight: "900",
  },
  policyText: {
    flex: 1,
    color: "rgba(255,255,255,0.68)",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
});
