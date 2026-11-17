import { NextRequest, NextResponse } from "next/server";
import {
  BhashiniTranslationError,
  MAX_TRANSLATION_CHARACTERS,
  translateWithBhashini,
} from "@/lib/translator/bhashini";
import { translate } from "@/lib/translator/translator";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Please provide a translation request." }, { status: 400 });
  }

  const { text } = body;
  const method = body.method ?? "rule-based";
  const source = body.source ?? "ne";
  const target = body.target ?? "en";

  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json(
      { error: "Please provide Nepali text." },
      { status: 400 },
    );
  }

  if (text.length > MAX_TRANSLATION_CHARACTERS) {
    return NextResponse.json(
      {
        error: `Maximum text length is ${MAX_TRANSLATION_CHARACTERS.toLocaleString()} characters.`,
      },
      { status: 400 },
    );
  }

  if (source !== "ne" || target !== "en") {
    return NextResponse.json(
      { error: "Only Nepali to English translation is supported." },
      { status: 400 },
    );
  }

  if (method !== "bhashini" && method !== "rule-based") {
    return NextResponse.json(
      { error: "Choose Bhashini or the rule-based translation method." },
      { status: 400 },
    );
  }

  if (method === "rule-based") {
    return NextResponse.json({
      success: true,
      data: translate(text),
    });
  }

  try {
    const result = await translateWithBhashini(text);

    return NextResponse.json({
      success: true,
      data: {
        original: text,
        translated: result.translation,
        method: "bhashini",
        model: result.models?.join(", "),
        characters: result.characters,
        freeCharsLeftToday: result.freeCharsLeftToday,
      },
    });
  } catch (error) {
    if (error instanceof BhashiniTranslationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Bhashini translation error:", error);
    return NextResponse.json(
      { error: "Translation failed. Please try again." },
      { status: 500 },
    );
  }
}
