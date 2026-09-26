"use client";

import { useState } from "react";

type Analysis = {
  claim: string;
  stakeholders: string[];
  confidence: "high" | "medium" | "low";
  evidence: string[];
};

export default function PolicyAnalyzer() {
  const [policyText, setPolicyText] =
    useState("");

  const [analysis, setAnalysis] =
    useState<Analysis | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function analyzePolicy() {
    if (!policyText.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const response = await fetch(
        "/api/analyze-policy",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            policyText,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Policy analysis failed"
        );
      }

      const data: Analysis =
        await response.json();

      setAnalysis(data);
    } catch (error) {
      console.error(error);

      setError(
        "Unable to analyze the policy. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Microsoft Foundry
        </p>

        <h2 className="mt-1 text-2xl font-semibold">
          Analyze Policy
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          Paste policy language below.
          TRACE will identify the
          requirement, affected stakeholders,
          confidence, and supporting evidence.
        </p>
      </div>

      <textarea
        value={policyText}
        onChange={(event) =>
          setPolicyText(event.target.value)
        }
        placeholder="Example: Organizations must submit quarterly reports within 30 days of each reporting period."
        className="mt-5 min-h-40 w-full rounded-lg border border-gray-300 p-4 outline-none focus:border-blue-500"
      />

      <button
        type="button"
        onClick={analyzePolicy}
        disabled={
          loading ||
          !policyText.trim()
        }
        className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Analyzing..."
          : "Analyze Policy"}
      </button>

      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {analysis && (
        <div className="mt-6 space-y-5 rounded-xl border bg-gray-50 p-5">

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              AI-generated interpretation
            </p>

            <p className="mt-2 text-lg font-medium">
              {analysis.claim}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700">
              Affected Stakeholders
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {analysis.stakeholders.map(
                (stakeholder) => (
                  <span
                    key={stakeholder}
                    className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                  >
                    {stakeholder}
                  </span>
                )
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700">
              Confidence
            </p>

            <p className="mt-1 capitalize">
              {analysis.confidence}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700">
              Supporting Evidence
            </p>

            <div className="mt-2 space-y-2">
              {analysis.evidence.map(
                (item, index) => (
                  <blockquote
                    key={index}
                    className="rounded-lg border-l-4 border-blue-500 bg-white p-3 text-sm text-gray-700"
                  >
                    “{item}”
                  </blockquote>
                )
              )}
            </div>
          </div>

          <div className="rounded-lg bg-yellow-50 p-3 text-xs text-yellow-900">
            AI-generated interpretation.
            Analysts should verify conclusions
            against the original policy text.
          </div>

        </div>
      )}
    </section>
  );
}