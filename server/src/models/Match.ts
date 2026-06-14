import mongoose, { Schema, Types } from "mongoose";

export type MatchStage =
  | "GROUP_STAGE"
  | "LAST_32"
  | "LAST_16"
  | "QUARTER_FINALS"
  | "SEMI_FINALS"
  | "THIRD_PLACE"
  | "FINAL";

export type MatchStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "EXTRA_TIME"
  | "PENALTY_SHOOTOUT"
  | "FINISHED"
  | "SUSPENDED"
  | "POSTPONED"
  | "CANCELLED"
  | "AWARDED";

export type FirstScorerTeam = "HOME" | "AWAY" | "NONE";

export interface IMatchTeam {
  id?: number;
  name?: string;
  shortName?: string;
  tla?: string;
  crest?: string;
}

export interface IMatchResult {
  homeScore90?: number;
  awayScore90?: number;
  firstScorerTeam?: FirstScorerTeam;
  playerOfTheMatch?: string | null;
  enteredBy?: Types.ObjectId;
  enteredAt?: Date;
}

export interface IMatch {
  externalId: number;
  competition: string;
  stage?: MatchStage;
  group: string | null;
  utcDate: Date;
  status: MatchStatus;
  homeTeam?: IMatchTeam;
  awayTeam?: IMatchTeam;
  result: IMatchResult | null;
  scored: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const matchTeamSchema = new Schema<IMatchTeam>(
  {
    id: Number,
    name: String,
    shortName: String,
    tla: String,
    crest: String,
  },
  { _id: false },
);

const matchResultSchema = new Schema<IMatchResult>(
  {
    homeScore90: Number,
    awayScore90: Number,
    firstScorerTeam: {
      type: String,
      enum: ["HOME", "AWAY", "NONE"],
    },
    playerOfTheMatch: {
      type: String,
      default: null,
    },
    enteredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    enteredAt: Date,
  },
  { _id: false },
);

const matchSchema = new Schema<IMatch>(
  {
    externalId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    competition: {
      type: String,
      default: "WC",
    },
    stage: {
      type: String,
      enum: [
        "GROUP_STAGE",
        "LAST_32",
        "LAST_16",
        "QUARTER_FINALS",
        "SEMI_FINALS",
        "THIRD_PLACE",
        "FINAL",
      ],
    },
    group: {
      type: String,
      default: null,
    },
    utcDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "SCHEDULED",
        "TIMED",
        "IN_PLAY",
        "PAUSED",
        "EXTRA_TIME",
        "PENALTY_SHOOTOUT",
        "FINISHED",
        "SUSPENDED",
        "POSTPONED",
        "CANCELLED",
        "AWARDED",
      ],
      default: "SCHEDULED",
    },
    homeTeam: matchTeamSchema,
    awayTeam: matchTeamSchema,
    result: {
      type: matchResultSchema,
      default: null,
    },
    scored: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

matchSchema.index({ utcDate: 1 });
matchSchema.index({ status: 1, utcDate: 1 });

export const Match = mongoose.model<IMatch>("Match", matchSchema);
