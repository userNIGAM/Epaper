import mongoose from "mongoose";
import StudentKYC from "../models/StudentKYC.js";
import User from "../models/User.js";

export default async function connectDb() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI must be configured.");
  await mongoose.connect(uri, {
    autoIndex: process.env.NODE_ENV !== "production",
  });
  await Promise.all([User.createIndexes(), StudentKYC.createIndexes()]);
  console.log("Connected to MongoDB");
}
