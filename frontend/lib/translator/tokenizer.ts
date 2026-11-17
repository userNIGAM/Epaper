export function tokenize(text: string): string[] {
  return text
    .trim()
    .replace(/[।]/g, " । ")
    .replace(/([,!?])/g, " $1 ")
    .split(/\s+/)
    .filter(Boolean);
}

export function cleanTokens(tokens: string[]): string[] {
  return tokens.filter((token) => !["।", ".", ",", "!", "?"].includes(token));
}
