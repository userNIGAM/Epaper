import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
    phone: { type: String, trim: true, maxlength: 30, default: "" },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["student", "admin"], default: "student", required: true },
  },
  { timestamps: true },
);

export default mongoose.models.User || mongoose.model("User", userSchema);
