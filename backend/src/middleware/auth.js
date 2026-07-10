import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { User } from "../models/User.js";
import { AdminUser } from "../models/AdminUser.js";

export function signUserToken(user) {
  return jwt.sign({ userId: user._id.toString(), type: "user" }, config.jwtSecret, { expiresIn: "30d" });
}

export function signAdminToken(admin) {
  return jwt.sign({ adminId: admin._id.toString(), type: "admin" }, config.adminJwtSecret, { expiresIn: "7d" });
}

export async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) return res.status(401).json({ message: "Нет токена" });
    if (token.startsWith("local-")) return res.status(401).json({ message: "Локальный токен работает только без бэкенда" });

    const payload = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(payload.userId);
    if (!user || user.isBlocked) return res.status(401).json({ message: "Пользователь недоступен" });

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Неверный токен" });
  }
}

export async function adminRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const bearer = header.startsWith("Bearer ") ? header.slice(7) : null;
    const legacyKey = req.headers["x-admin-key"] || req.query.adminKey;

    if (legacyKey && legacyKey === config.adminKey) return next();
    if (!bearer) return res.status(401).json({ message: "Нужен вход администратора" });

    const payload = jwt.verify(bearer, config.adminJwtSecret);
    const admin = await AdminUser.findById(payload.adminId);
    if (!admin || !admin.isActive) return res.status(401).json({ message: "Администратор недоступен" });

    req.admin = admin;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Неверная админ-сессия" });
  }
}
