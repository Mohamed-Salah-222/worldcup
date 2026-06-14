import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDb } from "../config/db";
import { User } from "../models";

dotenv.config();

async function run(): Promise<void> {
  const username = process.argv[2]?.toLowerCase();

  if (!username) {
    throw new Error("Usage: npm run promote -- myusername");
  }

  const mongoStatus = await connectDb();

  if (mongoStatus !== "connected") {
    throw new Error("MONGODB_URI is required to promote a user.");
  }

  const result = await User.updateOne(
    { username },
    { $set: { role: "admin" } },
  );
  const user = await User.findOne({ username });

  console.log({
    matched: result.matchedCount,
    modified: result.modifiedCount,
    username,
    role: user?.role ?? null,
  });
}

run()
  .catch((error) => {
    console.error("Promote admin failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
