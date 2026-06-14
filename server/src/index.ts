import dotenv from "dotenv";
import app from "./app";
import { connectDb } from "./config/db";

dotenv.config();

const port = process.env.PORT || 4000;

function cairoTime(): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "long",
    timeZone: "Africa/Cairo",
  }).format(new Date());
}

async function startServer(): Promise<void> {
  const mongoStatus = await connectDb();

  app.listen(port, () => {
    console.log(`MongoDB: ${mongoStatus}`);
    console.log(`Server listening on port ${port}`);
    console.log(`Current time in Africa/Cairo: ${cairoTime()}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
