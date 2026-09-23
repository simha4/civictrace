"use client";

import { useState } from "react";

type Evidence = {
  id: string;
  caseId: string;
  sourceTitle: string;
  sourceType: string;
  pageNumber: number;
  content: string;
};

type QAResponse = {
  answer: string;
  confidence: "high" | "medium" | "low";
  evidenceIds: string[];
  limitations: string[];
  evidence: Evidence[];
};

type PolicyQAProps = {
  caseId: string | null;
  sourceTitle: string | null;
};

export default function PolicyQA({
  caseId,
  sourceTitle,
}: PolicyQAProps) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<QAResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function askQuestion() {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || !caseId) {
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/ask-policy", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          question: trimmedQuestion,
          caseId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Unable to answer the question."
        );
      }

      setResult(data);
    } catch (error) {
      console.error("CivicTrace Q&A error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to answer the question."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    await askQuestion();
  }

  function confidenceClasses(
    confidence: QAResponse["confidence"]
  ) {
    if (confidence === "high") {
      return "bg-green-100 text-green-800";
    }

    if (confidence === "medium") {
      return "bg-yellow-100 text-yellow-800";
    }

    return "bg-red-100 text-red-800";
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
        Azure AI Search + Microsoft Foundry
      </p>

      <h2 className="mt-2 text-2xl font-bold">
        Ask CivicTrace
      </h2>

      {caseId ? (
        <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">
          Searching evidence from{" "}
          <span className="font-semibold">
            {sourceTitle ?? "the uploaded document"}
          </span>
          .
        </div>
      ) : (
        <div className="mt-3 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-900">
          Upload a policy PDF first. CivicTrace will automatically index its
          evidence and enable grounded questions here.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6"
      >
        <label
          htmlFor="civictrace-question"
          className="text-sm font-medium"
        >
          Question
        </label>

        <textarea
          id="civictrace-question"
          value={question}
          onChange={(event) =>
            setQuestion(event.target.value)
          }
          disabled={!caseId}
          placeholder="Example: What are students expected to do?"
          className="mt-2 min-h-28 w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-blue-500 disabled:bg-gray-100"
        />

        <button
          type="submit"
          disabled={
            !caseId ||
            !question.trim() ||
            loading
          }
          className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Searching & answering..."
            : "Ask CivicTrace"}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Grounded Answer
              </p>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${confidenceClasses(
                  result.confidence
                )}`}
              >
                {result.confidence} confidence
              </span>
            </div>

            <p className="mt-3 leading-7">
              {result.answer}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold">
              Supporting Evidence
            </h3>

            <p className="mt-1 text-sm text-gray-600">
              These passages were retrieved from the currently selected
              document before Foundry generated the answer.
            </p>

            <div className="mt-4 space-y-4">
              {result.evidence.length > 0 ? (
                result.evidence.map((evidence) => (
                  <article
                    key={evidence.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        Page {evidence.pageNumber}
                      </span>

                      <span className="text-sm font-semibold">
                        {evidence.sourceTitle}
                      </span>
                    </div>

                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {evidence.sourceType}
                    </p>

                    <blockquote className="mt-4 whitespace-pre-wrap border-l-4 border-blue-500 pl-4 text-sm leading-6 text-gray-700">
                      {evidence.content}
                    </blockquote>
                  </article>
                ))
              ) : (
                <p className="text-sm text-gray-600">
                  No supporting evidence was returned.
                </p>
              )}
            </div>
          </div>

          {result.limitations.length > 0 && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
              <h3 className="font-semibold">
                Limitations
              </h3>

              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
                {result.limitations.map(
                  (limitation, index) => (
                    <li key={index}>
                      {limitation}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-600">
            AI-generated interpretation. CivicTrace retrieves evidence through
            Azure AI Search before asking Microsoft Foundry to answer. Evidence
            text and page references come from indexed source material rather
            than being generated by the language model.
          </div>
        </div>
      )}
    </section>
  );
}