import mongoose from "mongoose";

const AuthCodeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    consumedAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
    requestedIp: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    emailMessageId: { type: String, default: "" },
  },
  { timestamps: true }
);

export const AuthCode = mongoose.model("AuthCode", AuthCodeSchema);
