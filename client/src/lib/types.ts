export type Stage =
  | "GROUP_STAGE"
  | "LAST_32"
  | "LAST_16"
  | "QUARTER_FINALS"
  | "SEMI_FINALS"
  | "THIRD_PLACE"
  | "FINAL";

export type DoublerStage = Exclude<Stage, "THIRD_PLACE">;

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

export type PredictionWinner = "HOME" | "DRAW" | "AWAY";
export type FirstScorerTeam = "HOME" | "AWAY" | "NONE";

export type Team = {
  id?: number;
  name?: string;
  shortName?: string;
  tla?: string;
  crest?: string;
};

export type Match = {
  _id: string;
  externalId: number;
  competition: string;
  stage: Stage;
  group: string | null;
  utcDate: string;
  status: MatchStatus;
  homeTeam?: Team;
  awayTeam?: Team;
  scored: boolean;
  result?: MatchResult | null;
  scoringStatus?: "NOT_READY" | "SCORED" | "LOCKED_AWAITING_RESULT";
};

export type MatchResult = {
  homeScore90?: number;
  awayScore90?: number;
  firstScorerTeam?: FirstScorerTeam;
  playerOfTheMatch?: string | null;
  enteredAt?: string;
};

export type Prediction = {
  _id: string;
  user: string | { _id: string; username: string; displayName: string };
  match: string | Match;
  winner: PredictionWinner;
  homeScore: number;
  awayScore: number;
  firstScorerTeam: FirstScorerTeam;
  playerOfTheMatchGuess: string;
  doublerApplied: boolean;
  pointsAwarded: number;
  pointsBreakdown: {
    winner: number;
    score: number;
    firstScorer: number;
    potm: number;
    doubled: boolean;
  };
  submittedAt: string;
  editCount?: number;
};

export type PublicMatchPrediction = {
  _id: string;
  user: {
    _id: string;
    username: string;
    displayName: string;
    role: "user" | "admin";
  };
  winner: PredictionWinner;
  homeScore: number;
  awayScore: number;
  firstScorerTeam: FirstScorerTeam;
  playerOfTheMatchGuess: string;
  doublerApplied: boolean;
  submittedAt: string;
  editCount: number;
  pointsAwarded: number;
  pointsBreakdown: {
    winner: number;
    score: number;
    firstScorer: number;
    potm: number;
    doubled: boolean;
  };
  scored: boolean;
};

export type MatchPredictionsResponse = {
  matchId: string;
  predictions: PublicMatchPrediction[];
  count: number;
};

export type AdminMatchPredictionsResponse = {
  match: Match;
  predictions: Prediction[];
};

export type ScoreSummary = {
  scored: number;
  totalPointsAwarded: number;
  perUser: Array<{
    userId: string;
    username: string;
    pointsThisMatch: number;
    newTotal: number;
  }>;
};

export type LeaderboardRow = {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  role: "user" | "admin";
  totalPoints: number;
  predictionsCount: number;
  matchesScored: number;
  correctWinners: number;
  exactScores: number;
};

export type LeaderboardResponse = {
  leaderboard: LeaderboardRow[];
  lastUpdated: string;
};

export type DetailedPredictionsResponse = {
  predictions: Prediction[];
  stats: {
    total: number;
    scored: number;
    pending: number;
    pointsTotal: number;
  };
};

export type DoublerStatus = Record<
  DoublerStage,
  {
    used: boolean;
    matchId: string | null;
    matchLabel: string | null;
  }
>;

export type MatchesResponse = {
  matches: Match[];
};

export type PredictionsResponse = {
  predictions: Prediction[];
};

export type DoublersResponse = {
  doublersUsed: DoublerStatus;
};
