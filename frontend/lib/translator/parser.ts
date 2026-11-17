import { ParsedSentence } from "./types";
import { getVerb } from "./morphology";

const subjects: Record<string, string> = {
  म: "I",
  मैले: "I",
  मलाई: "I",
  हामी: "we",
  हामीले: "we",
  तिमी: "you",
  तिमीले: "you",
  तिमीलाई: "you",
  तपाईं: "you",
  तपाईंले: "you",
  उनी: "they",
  ऊ: "they",
  उसले: "they",
  उसलाई: "they",
  उनीहरू: "they",
  उनीहरूले: "they",
  यो: "this",
  त्यो: "that",
};

export function parseSentence(tokens: string[]): ParsedSentence | null {
  if (tokens.length < 2) {
    return null;
  }

  const verb = tokens[tokens.length - 1];
  const verbInfo = getVerb(verb);

  if (
    tokens[0] === "मेरो" &&
    tokens[1] === "नाम" &&
    verbInfo?.english === "be"
  ) {
    return {
      subject: "My name",
      object: tokens.slice(2, -1),
      verb,
      tense: verbInfo.tense,
      negative: false,
      question: false,
    };
  }

  const subject = tokens[0];

  if (!verbInfo) {
    return null;
  }

  const translatedSubject = subjects[subject];

  if (!translatedSubject) {
    const inferredSubject =
      verbInfo.person === "first"
        ? verbInfo.number === "plural"
          ? "we"
          : "I"
        : verbInfo.person === "second"
          ? "you"
          : "they";

    return {
      subject: inferredSubject,
      object: tokens.slice(0, -1),
      verb,
      tense: verbInfo.tense,
      negative: false,
      question: false,
    };
  }

  const object = tokens.slice(1, -1);

  return {
    subject: translatedSubject,
    object,
    verb,
    tense: verbInfo.tense,
    negative: false,
    question: false,
  };
}
