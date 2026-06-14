export function normalizePlayerName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function isPotmMatch(guess: string, actual: string | null): boolean {
  if (actual === null) {
    return false;
  }

  const normalizedGuess = normalizePlayerName(guess);
  const normalizedActual = normalizePlayerName(actual);

  if (!normalizedGuess || !normalizedActual) {
    return false;
  }

  if (normalizedGuess === normalizedActual) {
    return true;
  }

  const actualParts = normalizedActual.split(" ");
  return actualParts.length > 1 && normalizedGuess === actualParts.at(-1);
}
