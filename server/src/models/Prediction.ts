import mongoose, { Schema, Types } from "mongoose";

export type PredictionWinner = "HOME" | "DRAW" | "AWAY";
export type PredictionFirstScorerTeam = "HOME" | "AWAY" | "NONE";

export interface IPointsBreakdown {
  winner: number;
  score: number;
  firstScorer: number;
  potm: number;
  doubled: boolean;
}

export interface IPredictionEditHistory {
  at: Date;
  winner: PredictionWinner;
  homeScore: number;
  awayScore: number;
  firstScorerTeam: PredictionFirstScorerTeam;
  playerOfTheMatchGuess: string;
  doublerApplied: boolean;
}

export interface IPrediction {
  user: Types.ObjectId;
  match: Types.ObjectId;
  winner: PredictionWinner;
  homeScore: number;
  awayScore: number;
  firstScorerTeam: PredictionFirstScorerTeam;
  playerOfTheMatchGuess: string;
  doublerApplied: boolean;
  pointsAwarded: number;
  pointsBreakdown: IPointsBreakdown;
  submittedAt: Date;
  editHistory: IPredictionEditHistory[];
  createdAt?: Date;
  updatedAt?: Date;
}

const pointsBreakdownSchema = new Schema<IPointsBreakdown>(
  {
    winner: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    firstScorer: { type: Number, default: 0 },
    potm: { type: Number, default: 0 },
    doubled: { type: Boolean, default: false },
  },
  { _id: false },
);

const predictionEditHistorySchema = new Schema<IPredictionEditHistory>(
  {
    at: {
      type: Date,
      default: Date.now,
    },
    winner: {
      type: String,
      enum: ["HOME", "DRAW", "AWAY"],
      required: true,
    },
    homeScore: {
      type: Number,
      required: true,
      min: 0,
      max: 30,
    },
    awayScore: {
      type: Number,
      required: true,
      min: 0,
      max: 30,
    },
    firstScorerTeam: {
      type: String,
      enum: ["HOME", "AWAY", "NONE"],
      required: true,
    },
    playerOfTheMatchGuess: {
      type: String,
      trim: true,
      maxlength: 60,
      required: true,
    },
    doublerApplied: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const predictionSchema = new Schema<IPrediction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    match: {
      type: Schema.Types.ObjectId,
      ref: "Match",
      required: true,
      index: true,
    },
    winner: {
      type: String,
      enum: ["HOME", "DRAW", "AWAY"],
      required: true,
    },
    homeScore: {
      type: Number,
      required: true,
      min: 0,
      max: 30,
    },
    awayScore: {
      type: Number,
      required: true,
      min: 0,
      max: 30,
    },
    firstScorerTeam: {
      type: String,
      enum: ["HOME", "AWAY", "NONE"],
      required: true,
    },
    playerOfTheMatchGuess: {
      type: String,
      trim: true,
      maxlength: 60,
      required: true,
    },
    doublerApplied: {
      type: Boolean,
      default: false,
    },
    pointsAwarded: {
      type: Number,
      default: 0,
    },
    pointsBreakdown: {
      type: pointsBreakdownSchema,
      default: () => ({}),
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    editHistory: {
      type: [predictionEditHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

predictionSchema.index({ user: 1, match: 1 }, { unique: true });

function createValidationError(
  path: string,
  message: string,
): mongoose.Error.ValidationError {
  const error = new mongoose.Error.ValidationError();
  error.addError(
    path,
    new mongoose.Error.ValidatorError({
      path,
      message,
    }),
  );
  return error;
}

predictionSchema.pre("save", function validateWinnerAndScores(next) {
  if (this.winner === "DRAW" && this.homeScore !== this.awayScore) {
    next(
      createValidationError(
        "winner",
        "Draw predictions must have equal home and away scores.",
      ),
    );
    return;
  }

  if (this.winner === "HOME" && this.homeScore <= this.awayScore) {
    next(
      createValidationError(
        "winner",
        "Home win predictions must have homeScore greater than awayScore.",
      ),
    );
    return;
  }

  if (this.winner === "AWAY" && this.awayScore <= this.homeScore) {
    next(
      createValidationError(
        "winner",
        "Away win predictions must have awayScore greater than homeScore.",
      ),
    );
    return;
  }

  next();
});

predictionSchema.pre("save", function validateFirstScorer(next) {
  if (this.homeScore === 0 && this.awayScore === 0) {
    if (this.firstScorerTeam !== "NONE") {
      next(
        createValidationError(
          "firstScorerTeam",
          "0-0 predictions must use firstScorerTeam NONE.",
        ),
      );
      return;
    }
  } else if (this.firstScorerTeam === "NONE") {
    next(
      createValidationError(
        "firstScorerTeam",
        "Predictions with goals must use firstScorerTeam HOME or AWAY.",
      ),
    );
    return;
  }

  next();
});

export const Prediction = mongoose.model<IPrediction>(
  "Prediction",
  predictionSchema,
);
