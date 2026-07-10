import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 8000),
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/tourisk",
  jwtSecret: process.env.JWT_SECRET || "tourisk-mvp-secret-change-on-server",
  adminJwtSecret: process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "tourisk-admin-secret-change-on-server",
  adminLogin: process.env.ADMIN_LOGIN || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "tourisk1111",
  adminKey: process.env.ADMIN_KEY || "tourisk-admin-1111",
  appUrl: process.env.APP_URL || "http://localhost:19006",
  nodeEnv: process.env.NODE_ENV || "development",
};
