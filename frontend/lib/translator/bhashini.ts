export const MAX_TRANSLATION_CHARACTERS = 10_000;

const BHASHINI_API_URL = "https://mcp.bhasini.com/v1/translate";
const REQUEST_TIMEOUT_MS = 30_000;

export interface BhashiniResponse {
  translation: string;
  models?: string[];
  characters?: number;
  freeCharsLeftToday?: number;
}

export class BhashiniTranslationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "BhashiniTranslationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function getProviderError(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;

  if (typeof value.message === "string") return value.message;
  if (typeof value.error === "string") return value.error;

  if (isRecord(value.error) && typeof value.error.message === "string") {
    return value.error.message;
  }

  return undefined;
}

export async function translateWithBhashini(
  text: string,
): Promise<BhashiniResponse> {
  if (!text.trim()) {
    throw new BhashiniTranslationError(
      "Please enter Nepali text to translate.",
      400,
    );
  }

  if (text.length > MAX_TRANSLATION_CHARACTERS) {
    throw new BhashiniTranslationError(
      `Text must be ${MAX_TRANSLATION_CHARACTERS.toLocaleString()} characters or fewer.`,
      400,
    );
  }

  let response: Response;

  try {
    const body = Buffer.from(
      JSON.stringify({ text, source: "ne", target: "en" }),
      "utf8",
    );

    response = await fetch(BHASHINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new BhashiniTranslationError(
        "Bhashini translation timed out. Please try again.",
        504,
      );
    }

    throw new BhashiniTranslationError(
      "Bhashini is unavailable right now. Please try again or choose the rule-based translator.",
      503,
    );
  }

  let responseText: string;
  try {
    responseText = await response.text();
  } catch {
    throw new BhashiniTranslationError(
      "Could not read the response from Bhashini.",
      502,
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(responseText);
  } catch {
    if (!response.ok) {
      if (response.status === 429) {
        throw new BhashiniTranslationError(
          "Bhashini rate limit or daily character quota reached. Please try again later.",
          429,
        );
      }

      if (response.status === 402) {
        throw new BhashiniTranslationError(
          "Bhashini reports that the daily translation quota may be exhausted.",
          402,
        );
      }

      if (response.status === 402) {
        throw new BhashiniTranslationError(
          "Bhashini reports that the daily translation quota may be exhausted.",
          402,
        );
      }

      throw new BhashiniTranslationError(
        "Bhashini could not complete the translation. Please try again.",
        response.status >= 500 ? 503 : 502,
      );
    }

    throw new BhashiniTranslationError(
      "Bhashini returned an invalid response.",
      502,
    );
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new BhashiniTranslationError(
        "Bhashini rate limit or daily character quota reached. Please try again later.",
        429,
      );
    }

    if (response.status >= 500) {
      throw new BhashiniTranslationError(
        "Bhashini is temporarily unavailable. Please try again.",
        503,
      );
    }

    throw new BhashiniTranslationError(
      getProviderError(data) ??
        "Bhashini rejected the translation request. Check the text and try again.",
      response.status,
    );
  }

  if (!isRecord(data) || typeof data.translation !== "string") {
    throw new BhashiniTranslationError(
      "Bhashini returned an unexpected response format.",
      502,
    );
  }

  if (
    (data.source !== undefined && data.source !== "ne") ||
    (data.target !== undefined && data.target !== "en")
  ) {
    throw new BhashiniTranslationError(
      "Bhashini returned a response for an unsupported language direction.",
      502,
    );
  }

  const translation = data.translation.trim();
  if (!translation) {
    throw new BhashiniTranslationError(
      "Bhashini returned an empty translation.",
      502,
    );
  }

  const models = Array.isArray(data.models)
    ? data.models.filter((model): model is string => typeof model === "string")
    : undefined;

  return {
    translation,
    models: models?.length ? models : undefined,
    characters: finiteNumber(data.characters),
    freeCharsLeftToday: finiteNumber(data.freeCharsLeftToday),
  };
}
