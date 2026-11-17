export type PartOfSpeech =
  | "noun"
  | "pronoun"
  | "verb"
  | "adjective"
  | "adverb"
  | "postposition"
  | "particle"
  | "unknown";

export type Tense = "present" | "past" | "future" | "unknown";

export type Person = "first" | "second" | "third";

export interface DictionaryEntry {
  nepali: string;
  english: string;
  pos: PartOfSpeech;
}

export interface VerbEntry {
  nepali: string;
  english: string;
  tense: Tense;
  person: Person;
  number: "singular" | "plural";
  negative?: boolean;
}

export interface ParsedSentence {
  subject: string;
  object: string[];
  verb: string;
  tense: Tense;
  negative: boolean;
  question: boolean;
}

export interface RuleBasedTranslationResult {
  original: string;
  translated: string;
  confidence: "high" | "medium" | "low";
  unknownWords: string[];
  method: "rule-based";
}

export interface BhashiniTranslationResult {
  original: string;
  translated: string;
  method: "bhashini";
  model?: string;
  characters?: number;
  freeCharsLeftToday?: number;
}

export type TranslationResult =
  | RuleBasedTranslationResult
  | BhashiniTranslationResult;
