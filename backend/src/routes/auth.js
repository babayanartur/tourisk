import crypto from "node:crypto";
import express from "express";
import { config } from "../config.js";
import { AuthCode } from "../models/AuthCode.js";
import { User } from "../models/User.js";
import { signUserToken } from "../middleware/auth.js";
import { sendLoginCodeEmail } from "../services/emailService.js";
import { normalizeUser } from "../utils/game.js";

export const authRouter = express.Router();

const REQUEST_COOLDOWN_MS = 60 * 1000;
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const ipRequests = new Map();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function createCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashCode(email, code) {
  return crypto.createHmac("sha256", config.authCodeSecret).update(`${email}:${code}`).digest("hex");
}

function hashesEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""), "hex");
  const rightBuffer = Buffer.from(String(right || ""), "hex");
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function checkIpLimit(ip) {
  const now = Date.now();
  const windowStart = now - 15 * 60 * 1000;
  const recent = (ipRequests.get(ip) || []).filter((timestamp) => timestamp > windowStart);
  if (recent.length >= 20) return false;
  recent.push(now);
  ipRequests.set(ip, recent);
  return true;
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

authRouter.post("/email/request", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const ip = String(req.ip || req.socket?.remoteAddress || "unknown");

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Укажите корректную почту" });
    }

    if (!checkIpLimit(ip)) {
      return res.status(429).json({ message: "Слишком много запросов. Попробуйте позже" });
    }

    const lastCode = await AuthCode.findOne({ email }).sort({ createdAt: -1 }).select("createdAt").lean();
    if (lastCode?.createdAt && Date.now() - new Date(lastCode.createdAt).getTime() < REQUEST_COOLDOWN_MS) {
      const retryAfter = Math.ceil((REQUEST_COOLDOWN_MS - (Date.now() - new Date(lastCode.createdAt).getTime())) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({ message: `Повторный код можно запросить через ${retryAfter} сек.` });
    }

    await AuthCode.updateMany({ email, consumedAt: null }, { $set: { consumedAt: new Date() } });

    const code = createCode();
    const authCode = await AuthCode.create({
      email,
      codeHash: hashCode(email, code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
      requestedIp: ip,
      userAgent: String(req.get("user-agent") || "").slice(0, 500),
    });

    try {
      const delivery = await sendLoginCodeEmail({ email, code, requestId: authCode.id });
      authCode.emailMessageId = String(delivery?.id || "");
      await authCode.save();

      return res.json({
        ok: true,
        message: "Код отправлен на почту. Он действует 10 минут.",
        ...(delivery?.devCode ? { devCode: delivery.devCode } : {}),
      });
    } catch (error) {
      await AuthCode.deleteOne({ _id: authCode._id });
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

authRouter.post("/email/verify", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").trim();

    if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: "Неверный формат почты или кода" });
    }

    const authCode = await AuthCode.findOne({
      email,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!authCode) {
      return res.status(400).json({ message: "Код истёк или уже использован. Запросите новый" });
    }

    if (authCode.attempts >= MAX_VERIFY_ATTEMPTS) {
      authCode.consumedAt = new Date();
      await authCode.save();
      return res.status(429).json({ message: "Слишком много неверных попыток. Запросите новый код" });
    }

    if (!hashesEqual(authCode.codeHash, hashCode(email, code))) {
      authCode.attempts += 1;
      if (authCode.attempts >= MAX_VERIFY_ATTEMPTS) authCode.consumedAt = new Date();
      await authCode.save();
      return res.status(400).json({ message: "Неверный код" });
    }

    authCode.consumedAt = new Date();
    await authCode.save();

    const user = await findOrCreateUser({ email, provider: "email" });
    const token = signUserToken(user);
    return res.json({ token, user: normalizeUser(user, { includePrivate: true }) });
  } catch (error) {
    next(error);
  }
});
