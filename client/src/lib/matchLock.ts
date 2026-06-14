export function isMatchLocked(match: { utcDate: string | Date }): boolean {
  return new Date() >= new Date(match.utcDate);
}
