import express from "express";
import { AuthCode } from "../models/AuthCode.js";
import { User } from "../models/User.js";
import { signUserToken } from "../middleware/auth.js";
import { normalizeUser } from "../utils/game.js";

export const authRouter = express.Router();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function findOrCreateUser({ email, nickname, provider }) {
  const normalizedEmail = normalizeEmail(email);
  let user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    user = await User.create({
      email: normalizedEmail,
      nickname: nickname || normalizedEmail.split("@")[0] || "Explorer",
      provider,
    });
  }

  return user;
}

authRouter.post("/email/request", async (req, res) => {
  const email = normalizeEmail(req.body.email);

  if (!email.includes("@")) {
    return res.status(400).json({ message: "Укажи корректную почту" });
  }

  await AuthCode.deleteMany({ email, consumedAt: null });
  await AuthCode.create({
    email,
    code: "1111",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  return res.json({
    ok: true,
    message: "Код создан. Для MVP код входа 1111.",
    devCode: "1111",
  });
});

authRouter.post("/email/verify", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const code = String(req.body.code || "").trim();

  if (code !== "1111") {
    return res.status(400).json({ message: "Неверный код. На тесте код 1111." });
  }

  const authCode = await AuthCode.findOne({ email, code, consumedAt: null }).sort({ createdAt: -1 });

  if (authCode) {
    authCode.consumedAt = new Date();
    await authCode.save();
  }

  const user = await findOrCreateUser({ email, provider: "email" });
  const token = signUserToken(user);

  return res.json({ token, user: normalizeUser(user) });
});

authRouter.post("/provider", async (req, res) => {
  const provider = ["apple", "google"].includes(req.body.provider) ? req.body.provider : "demo";
  const email = normalizeEmail(req.body.email || `${provider}@tourisk.local`);
  const nickname = String(req.body.name || `${provider} Explorer`).trim();
  const user = await findOrCreateUser({ email, nickname, provider });
  const token = signUserToken(user);

  return res.json({ token, user: normalizeUser(user) });
});
