import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDb } from "../config/db";
import { AuditLog, Doubler, Match, Prediction, User } from "../models";

dotenv.config();

async function runSeed(): Promise<void> {
  const mongoStatus = await connectDb();

  if (mongoStatus !== "connected") {
    throw new Error("MONGODB_URI is required to run the seed script.");
  }

  const user = await User.create({
    username: "testuser",
    displayName: "Test",
    passwordHash: "placeholder",
  });

  const match = await Match.create({
    externalId: Date.now(),
    stage: "GROUP_STAGE",
    group: "GROUP_A",
    utcDate: new Date(),
    homeTeam: {
      id: 764,
      name: "Brazil",
      shortName: "Brazil",
      tla: "BRA",
      crest: "",
    },
    awayTeam: {
      id: 815,
      name: "Morocco",
      shortName: "Morocco",
      tla: "MAR",
      crest: "",
    },
  });

  const prediction = await Prediction.create({
    user: user._id,
    match: match._id,
    winner: "HOME",
    homeScore: 2,
    awayScore: 1,
    firstScorerTeam: "HOME",
    playerOfTheMatchGuess: "Vinicius Jr",
  });

  const doubler = await Doubler.create({
    user: user._id,
    stage: "GROUP_STAGE",
    match: match._id,
  });

  const auditLog = await AuditLog.create({
    user: user._id,
    action: "PREDICTION_CREATE",
    targetType: "Prediction",
    targetId: prediction._id,
    metadata: {
      seed: true,
    },
    ip: null,
    userAgent: null,
  });

  console.log("Inserted user:", user);
  console.log("Inserted match:", match);
  console.log("Inserted prediction:", prediction);
  console.log("Inserted doubler:", doubler);
  console.log("Inserted audit log:", auditLog);

  await AuditLog.deleteOne({ _id: auditLog._id });
  await Doubler.deleteOne({ _id: doubler._id });
  await Prediction.deleteOne({ _id: prediction._id });
  await Match.deleteOne({ _id: match._id });
  await User.deleteOne({ _id: user._id });
}

runSeed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
