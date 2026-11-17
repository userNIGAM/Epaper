import { dictionary } from "./dictionary";
import { tokenize, cleanTokens } from "./tokenizer";
import { analyzeNoun, getVerb } from "./morphology";
import { parseSentence } from "./parser";
import { RuleBasedTranslationResult } from "./types";

const nounSuffixes = ["बाट", "सँग", "लाई", "मा", "ले", "को", "की", "का"];

function getNounSuffix(word: string): string | undefined {
  return nounSuffixes.find(
    (suffix) => word.endsWith(suffix) && word.length > suffix.length,
  );
}

function translateWord(word: string, isDestination = false): string {
  const exactTranslation = dictionary[word]?.english;
  if (exactTranslation) return exactTranslation;

  const suffix = getNounSuffix(word);
  const root = analyzeNoun(suffix ? word.slice(0, -suffix.length) : word);
  const translation = dictionary[root]?.english;

  if (!translation) return `[${word}]`;

  if (root === "घर" && suffix === "मा") {
    return isDestination ? "home" : "at home";
  }

  switch (suffix) {
    case "बाट":
      return `from ${translation}`;
    case "सँग":
      return `with ${translation}`;
    case "लाई":
      return `to ${translation}`;
    case "मा":
      return `${isDestination ? "to" : "in"} ${translation}`;
    case "को":
    case "की":
    case "का":
      return `${translation}'s`;
    default:
      return translation;
  }
}

function conjugateVerb(verb: string, subject: string, tense: string): string {
  const verbInfo = getVerb(verb);

  if (!verbInfo) return verb;

  const base = verbInfo.english;

  if (base === "be") {
    if (tense === "past") {
      return ["I", "he", "she", "it", "this", "that"].includes(subject)
        ? "was"
        : "were";
    }

    if (subject === "I") return "am";
    if (["you", "we", "they"].includes(subject)) return "are";
    return "is";
  }

  if (tense === "past") {
    const past: Record<string, string> = {
      go: "went",
      eat: "ate",
      study: "studied",
      do: "did",
      write: "wrote",
      drink: "drank",
      live: "lived",
      speak: "spoke",
      see: "saw",
      need: "needed",
      like: "liked",
      come: "came",
      play: "played",
    };

    return past[base] ?? base;
  }

  if (tense === "future") {
    return `will ${base}`;
  }

  if (
    subject === "he" ||
    subject === "she" ||
    subject === "it" ||
    subject === "this" ||
    subject === "that"
  ) {
    const thirdPerson: Record<string, string> = {
      go: "goes",
      eat: "eats",
      study: "studies",
      do: "does",
      write: "writes",
    };

    return thirdPerson[base] ?? `${base}s`;
  }

  return base;
}

export function translate(input: string): RuleBasedTranslationResult {
  const tokens = cleanTokens(tokenize(input));

  if (!tokens.length) {
    return {
      original: input,
      translated: "",
      confidence: "low",
      unknownWords: [],
      method: "rule-based",
    };
  }

  const parsed = parseSentence(tokens);

  if (parsed) {
    const verbInfo = getVerb(parsed.verb)!;
    const objectTokens =
      verbInfo.english === "like"
        ? parsed.object.filter((word) => word !== "मन")
        : parsed.object;
    const hasPostposition = objectTokens.some((word) => getNounSuffix(word));
    const isDestinationVerb = ["go", "come"].includes(verbInfo.english);
    const destinationIndex = isDestinationVerb
      ? objectTokens.findIndex(
          (word) =>
            !getNounSuffix(word) &&
            dictionary[analyzeNoun(word)]?.pos === "noun",
        )
      : -1;
    const translatedObjectWords = objectTokens.map((word) =>
      translateWord(word, isDestinationVerb),
    );

    if (
      destinationIndex >= 0 &&
      translatedObjectWords[destinationIndex] !== "home"
    ) {
      let destinationPhraseStart = destinationIndex;

      while (
        destinationPhraseStart > 0 &&
        dictionary[objectTokens[destinationPhraseStart - 1]]?.pos ===
          "adjective"
      ) {
        destinationPhraseStart -= 1;
      }

      translatedObjectWords.splice(destinationPhraseStart, 0, "to");
    }

    if (verbInfo.english === "be") {
      const articleIndex = translatedObjectWords.findIndex((word) =>
        /^(a|an) /.test(word),
      );

      if (articleIndex > 0) {
        const [article, ...noun] = translatedObjectWords[articleIndex].split(" ");
        translatedObjectWords.splice(
          0,
          articleIndex + 1,
          [article, ...translatedObjectWords.slice(0, articleIndex), ...noun]
            .filter(Boolean)
            .join(" "),
        );
      }
    }

    const object = translatedObjectWords.join(" ");

    const verb = conjugateVerb(parsed.verb, parsed.subject, parsed.tense);
    const onlyAdverbs = objectTokens.every(
      (word) => dictionary[word]?.pos === "adverb",
    );
    const translatedObject =
      isDestinationVerb &&
      object &&
      destinationIndex < 0 &&
      !hasPostposition &&
      !onlyAdverbs
        ? `to ${object}`
        : object;

    let result = [parsed.subject, verb, translatedObject]
      .filter(Boolean)
      .join(" ");

    result = result.charAt(0).toUpperCase() + result.slice(1);
    const unknownWords = objectTokens.filter(
      (word) =>
        !dictionary[word] &&
        !dictionary[analyzeNoun(word)] &&
        !getVerb(word),
    );

    return {
      original: input,
      translated: result + ".",
      confidence: unknownWords.length ? "low" : "medium",
      unknownWords,
      method: "rule-based",
    };
  }

  // Fallback: dictionary-based word translation.
  const unknownWords: string[] = [];

  const translated = tokens
    .map((word) => {
      const translation = translateWord(word);

      if (
        !dictionary[word] &&
        !dictionary[analyzeNoun(word)] &&
        !getVerb(word)
      ) {
        unknownWords.push(word);
      }

      return translation === `[${word}]`
        ? getVerb(word)?.english ?? translation
        : translation;
    })
    .join(" ");

  return {
    original: input,
    translated: translated.charAt(0).toUpperCase() + translated.slice(1),
    confidence: unknownWords.length ? "low" : "medium",
    unknownWords,
    method: "rule-based",
  };
}
