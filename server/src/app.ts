import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middleware/errorHandler";
import adminRouter from "./routes/admin";
import authRouter from "./routes/auth";
import healthRouter from "./routes/health";
import leaderboardRouter from "./routes/leaderboard";
import matchesRouter from "./routes/matches";
import predictionsRouter from "./routes/predictions";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  }),
);
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/admin", adminRouter);
app.use("/api/auth", authRouter);
app.use("/api/health", healthRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/matches", matchesRouter);
app.use("/api/predictions", predictionsRouter);

app.use(errorHandler);

export default app;
