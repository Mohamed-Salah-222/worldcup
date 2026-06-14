export function isMatchLocked(match: { utcDate: Date }): boolean {
  return new Date() >= new Date(match.utcDate);
}

export function getStageOf(match: { stage: string }): string {
  return match.stage;
}
