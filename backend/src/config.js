import dotenv from "dotenv";

dotenv.config();

function normalizeUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

export const config = {
  port: Number(process.env.PORT || 8000),
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/tourisk",
  jwtSecret: process.env.JWT_SECRET || "tourisk-mvp-secret-change-on-server",
  adminJwtSecret: process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "tourisk-admin-secret-change-on-server",
  adminLogin: process.env.ADMIN_LOGIN || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "tourisk1111",
  adminKey: process.env.ADMIN_KEY || "tourisk-admin-1111",
  appUrl: normalizeUrl(process.env.APP_URL || "http://localhost:8081"),
  publicUrl: normalizeUrl(process.env.PUBLIC_URL || ""),
  nodeEnv: process.env.NODE_ENV || "development",
  authCodeSecret: process.env.AUTH_CODE_SECRET || process.env.JWT_SECRET || "tourisk-auth-code-secret-change-on-server",
  resendApiKey: String(process.env.RESEND_API_KEY || "").trim(),
  emailFrom: String(process.env.EMAIL_FROM || "Tourisk <login@tourisk.app>").trim(),
  emailReplyTo: String(process.env.EMAIL_REPLY_TO || "").trim(),
  emailDevMode: String(process.env.EMAIL_DEV_MODE || "false").toLowerCase() === "true",
};
