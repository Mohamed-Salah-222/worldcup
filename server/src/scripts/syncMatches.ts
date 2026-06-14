import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDb } from "../config/db";
import { fetchAllWorldCupMatches } from "../services/footballDataClient";
import { syncMatches } from "../services/matchSyncService";

dotenv.config();

function summarizeStages(rawApiResponse: any): Record<string, number> {
  const summary: Record<string, number> = {};
  const matches = Array.isArray(rawApiResponse?.matches)
    ? rawApiResponse.matches
    : [];

  for (const match of matches) {
    if (match?.competition?.code !== "WC") {
      continue;
    }

    const stage = String(match.stage ?? "UNKNOWN");
    summary[stage] = (summary[stage] ?? 0) + 1;
  }

  return summary;
}

async function run(): Promise<void> {
  const mongoStatus = await connectDb();

  if (mongoStatus !== "connected") {
    throw new Error("MONGODB_URI is required to sync matches.");
  }

  const result = await fetchAllWorldCupMatches();
  const counts = await syncMatches(result);
  const stageSummary = summarizeStages(result);

  console.log("Sync counts:", counts);
  console.log("Stages found:", stageSummary);
}

run()
  .catch((error) => {
    console.error("Match sync failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
