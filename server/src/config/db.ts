import mongoose from "mongoose";

export async function connectDb(): Promise<string> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    return "skipped (MONGODB_URI not set)";
  }

  await mongoose.connect(uri);
  return "connected";
}
