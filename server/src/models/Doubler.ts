import mongoose, { Schema, Types } from "mongoose";
import type { MatchStage } from "./Match";

export interface IDoubler {
  user: Types.ObjectId;
  stage: MatchStage;
  match: Types.ObjectId;
  appliedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const doublerSchema = new Schema<IDoubler>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
      required: true,
    },
    match: {
      type: Schema.Types.ObjectId,
      ref: "Match",
      required: true,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

doublerSchema.index({ user: 1, stage: 1 }, { unique: true });

export const Doubler = mongoose.model<IDoubler>("Doubler", doublerSchema);
