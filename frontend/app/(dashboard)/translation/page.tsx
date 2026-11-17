"use client";

import { useState } from "react";
import type { TranslationResult } from "@/lib/translator/types";

type TranslationMethod = "bhashini" | "rule-based";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTranslationResult(value: unknown): value is TranslationResult {
  if (!isRecord(value) || typeof value.original !== "string") return false;
  if (typeof value.translated !== "string") return false;

  if (value.method === "bhashini") {
    return (
      (value.model === undefined || typeof value.model === "string") &&
      (value.characters === undefined || typeof value.characters === "number") &&
      (value.freeCharsLeftToday === undefined ||
        typeof value.freeCharsLeftToday === "number")
    );
  }

  return (
    value.method === "rule-based" &&
    (value.confidence === "high" ||
      value.confidence === "medium" ||
      value.confidence === "low") &&
    Array.isArray(value.unknownWords) &&
    value.unknownWords.every((word) => typeof word === "string")
  );
}

export default function TranslationPage() {
  const [input, setInput] = useState("");
  const [method, setMethod] = useState<TranslationMethod>("bhashini");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [remainingChars, setRemainingChars] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleTranslate() {
    if (!input.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: input,
          method,
          source: "ne",
          target: "en",
        }),
      });

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new Error("The translation server returned invalid JSON.");
      }

      if (!response.ok) {
        const message =
          isRecord(payload) && typeof payload.error === "string"
            ? payload.error
            : "Translation failed.";
        throw new Error(message);
      }

      if (!isRecord(payload) || !isTranslationResult(payload.data)) {
        throw new Error("The translation server returned an unexpected response.");
      }

      if (payload.data.method !== method) {
        throw new Error("The translation method in the response did not match.");
      }

      setResult(payload.data);
      if (payload.data.method === "bhashini") {
        setRemainingChars(payload.data.freeCharsLeftToday ?? null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  function updateTranslation(translated: string) {
    setResult((current) =>
      current ? { ...current, translated } : current,
    );
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm text-slate-500">Dashboard / Translation</p>
        <h1 className="mt-3 text-3xl font-bold">Nepali to English Translator</h1>
        <p className="mt-2 text-slate-500">
          Translate Nepali text with Bhashini or the offline rule-based engine.
        </p>
      </div>

      <section className="max-w-md rounded-xl border bg-white p-5">
        <label htmlFor="translation-method" className="text-sm font-medium">
          Translation method
        </label>
        <select
          id="translation-method"
          value={method}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "bhashini" || value === "rule-based") {
              setMethod(value);
            }
          }}
          className="mt-2 h-11 w-full rounded-lg border bg-white px-3 outline-none focus:border-blue-500"
        >
          <option value="bhashini">Bhashini AI (online)</option>
          <option value="rule-based">Rule-based (offline)</option>
        </select>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Nepali</h2>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="यहाँ नेपाली वाक्य लेख्नुहोस्..."
            aria-label="Nepali text to translate"
            className="h-64 w-full resize-y rounded-lg border bg-slate-50 p-4 text-lg outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={handleTranslate}
            disabled={loading || !input.trim()}
            className="mt-4 w-full rounded-lg bg-blue-700 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Translating..."
              : method === "bhashini"
                ? "Translate with Bhashini AI"
                : "Translate with rule-based engine"}
          </button>
          {loading && (
            <p role="status" className="mt-2 text-center text-sm text-slate-500">
              Translation in progress...
            </p>
          )}
        </section>

        <section className="rounded-xl border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">English</h2>
          <textarea
            value={result?.translated ?? ""}
            onChange={(event) => updateTranslation(event.target.value)}
            placeholder="Your translation will appear here..."
            aria-label="Editable English translation"
            disabled={!result}
            className="h-64 w-full resize-y rounded-lg border bg-slate-50 p-4 text-lg outline-none focus:border-blue-500 disabled:text-slate-400"
          />

          {result?.method === "bhashini" && result.model && (
            <p className="mt-4 text-sm text-slate-500">
              Model reported by Bhashini: {result.model}
            </p>
          )}

          {result?.method === "rule-based" && (
            <div className="mt-4 text-sm text-slate-500">
              <p>Confidence indicator: {result.confidence}</p>
              {result.unknownWords.length > 0 && (
                <p className="mt-2">
                  Unknown words: {result.unknownWords.join(", ")}
                </p>
              )}
            </div>
          )}

          {remainingChars !== null && (
            <p className="mt-2 text-sm text-slate-500">
              Remaining free characters today (last reported by Bhashini):{" "}
              {remainingChars.toLocaleString()}
            </p>
          )}

          {result?.method === "bhashini" &&
            result.freeCharsLeftToday === undefined && (
              <p className="mt-2 text-sm text-slate-500">
                Bhashini did not include quota information in this response.
              </p>
            )}

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
