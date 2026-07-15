import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { config } from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const uploadsRoot = path.join(__dirname, "..", "..", "uploads");

export function publicBaseUrl(req) {
  if (config.publicUrl) return config.publicUrl;
  const forwardedProto = String(req?.headers?.["x-forwarded-proto"] || "").split(",")[0].trim();
  const protocol = forwardedProto || req?.protocol || "http";
  const host = req?.get?.("host") || req?.headers?.host || `localhost:${config.port}`;
  return `${protocol}://${host}`;
}

export function toPublicAssetUrl(req, value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  return `${publicBaseUrl(req)}${normalized}`;
}

export function serializeContentItem(req, item) {
  const plain = typeof item?.toObject === "function" ? item.toObject() : { ...(item || {}) };
  const imagePath = plain.imagePath || "";
  return {
    ...plain,
    imageUrl: imagePath ? toPublicAssetUrl(req, imagePath) : plain.imageUrl || "",
  };
}

export function isManagedUpload(value) {
  return /^\/uploads\/(pawns|achievements|places)\/[a-zA-Z0-9._-]+$/.test(String(value || ""));
}

export function deleteManagedUpload(value) {
  if (!isManagedUpload(value)) return false;
  const relative = String(value).replace(/^\/uploads\//, "");
  const absolute = path.join(uploadsRoot, relative);
  const resolved = path.resolve(absolute);
  if (!resolved.startsWith(path.resolve(uploadsRoot) + path.sep)) return false;
  if (!fs.existsSync(resolved)) return false;
  fs.unlinkSync(resolved);
  return true;
}
