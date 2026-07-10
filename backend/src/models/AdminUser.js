import mongoose from "mongoose";

const AdminUserSchema = new mongoose.Schema(
  {
    login: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: "Tourisk Admin" },
    role: { type: String, enum: ["owner", "admin"], default: "owner" },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const AdminUser = mongoose.model("AdminUser", AdminUserSchema);
