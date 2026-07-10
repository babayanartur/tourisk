import mongoose from "mongoose";

const AuthCodeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const AuthCode = mongoose.model("AuthCode", AuthCodeSchema);
