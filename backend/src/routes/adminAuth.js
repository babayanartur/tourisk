import bcrypt from "bcryptjs";
import express from "express";
import { config } from "../config.js";
import { AdminUser } from "../models/AdminUser.js";
import { signAdminToken } from "../middleware/auth.js";

export const adminAuthRouter = express.Router();

async function ensureDefaultAdmin() {
  const login = String(config.adminLogin || "admin").trim().toLowerCase();
  const existing = await AdminUser.findOne({ login });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(String(config.adminPassword || "tourisk1111"), 10);
  return AdminUser.create({ login, passwordHash, name: "Tourisk Owner", role: "owner" });
}

adminAuthRouter.post("/login", async (req, res) => {
  await ensureDefaultAdmin();
  const login = String(req.body.login || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  const admin = await AdminUser.findOne({ login });
  if (!admin || !admin.isActive) return res.status(401).json({ message: "Неверный логин или пароль" });

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ message: "Неверный логин или пароль" });

  admin.lastLoginAt = new Date();
  await admin.save();

  const token = signAdminToken(admin);
  return res.json({
    token,
    admin: { id: admin._id.toString(), login: admin.login, name: admin.name, role: admin.role },
  });
});

adminAuthRouter.get("/bootstrap", async (req, res) => {
  const admin = await ensureDefaultAdmin();
  return res.json({ login: admin.login, defaultPassword: config.nodeEnv === "development" ? config.adminPassword : undefined });
});
