"use client";

import { useState } from "react";

type Evidence = {
  id: string;
  caseId: string;
  sourceTitle: string;
  sourceType:
    | "policy"
    | "public_comment"
    | "hearing";
  pageNumber?: number;
  sequenceNumber?: number;
  speaker?: string;
  content: string;
};

type QAResponse = {
  answer: string;
  confidence:
    | "high"
    | "medium"
    | "low";
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
  const [question, setQuestion] =
    useState("");

  const [result, setResult] =
    useState<QAResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function askQuestion() {
    const trimmedQuestion =
      question.trim();

    if (
      !trimmedQuestion ||
      !caseId
    ) {
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        "/api/ask-policy",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            question:
              trimmedQuestion,

            caseId,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to answer the question."
        );
      }

      setResult(data);
    } catch (caughtError) {
      console.error(
        "TRACE Q&A error:",
        caughtError
      );

      setError(
        caughtError instanceof Error
          ? caughtError.message
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
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (
      confidence === "medium"
    ) {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    return "border-red-200 bg-red-50 text-red-700";
  }

  function sourceTypeLabel(
    sourceType: Evidence["sourceType"]
  ) {
    if (
      sourceType === "policy"
    ) {
      return "Policy";
    }

    if (
      sourceType ===
      "public_comment"
    ) {
      return "Public comment";
    }

    return "Hearing";
  }

  function evidenceLocationLabel(
    evidence: Evidence
  ) {
    if (
      evidence.sourceType ===
        "policy" &&
      typeof evidence.pageNumber ===
        "number"
    ) {
      return `Page ${evidence.pageNumber}`;
    }

    if (
      evidence.sourceType ===
        "public_comment" &&
      typeof evidence.sequenceNumber ===
        "number"
    ) {
      return `Comment ${evidence.sequenceNumber}`;
    }

    if (
      evidence.sourceType ===
      "hearing"
    ) {
      const parts: string[] = [];

      if (evidence.speaker) {
        parts.push(
          evidence.speaker
        );
      }

      if (
        typeof evidence.sequenceNumber ===
        "number"
      ) {
        parts.push(
          `Statement ${evidence.sequenceNumber}`
        );
      }

      if (
        parts.length > 0
      ) {
        return parts.join(
          " · "
        );
      }
    }

    return "Source evidence";
  }

  function cleanEvidenceText(
    text: string
  ) {
    return text
      .replace(
        /<!--[\s\S]*?-->/g,
        " "
      )
      .replace(
        /<[^>]*>/g,
        " "
      )
      .replace(
        /PageNumber\s*=\s*["']?\d+["']?/gi,
        " "
      )
      .replace(
        /PageBreak/gi,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();
  }

  function previewEvidence(
    text: string,
    maxLength = 260
  ) {
    const cleaned =
      cleanEvidenceText(text);

    if (
      cleaned.length <=
      maxLength
    ) {
      return cleaned;
    }

    return `${cleaned
      .slice(
        0,
        maxLength
      )
      .trim()}…`;
  }

  const exampleQuestions = [
    "What are the main implementation concerns?",
    "What issues appear across comments and hearing testimony?",
    "What costs or burdens are mentioned?",
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          Azure AI Search +
          Microsoft Foundry
        </p>

        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Ask TRACE
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Ask questions across
          the policy, submitted
          comments, and hearing
          evidence.
        </p>
      </div>

      {caseId ? (
        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />

          Searching the current
          TRACE case

          {sourceTitle && (
            <>
              <span className="text-emerald-400">
                ·
              </span>

              <span className="font-medium">
                {sourceTitle}
              </span>
            </>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Upload a policy PDF
          first to enable
          evidence-grounded
          questions.
        </div>
      )}

      <form
        onSubmit={
          handleSubmit
        }
        className="mt-6"
      >
        <label
          htmlFor="trace-question"
          className="text-sm font-medium text-slate-800"
        >
          Question
        </label>

        <textarea
          id="trace-question"
          value={question}
          onChange={(
            event
          ) =>
            setQuestion(
              event.target
                .value
            )
          }
          disabled={!caseId}
          placeholder="Ask a question about policy impacts, implementation, public feedback, or hearing testimony."
          className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 p-4 text-sm outline-none transition focus:border-blue-500 disabled:bg-slate-100"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {exampleQuestions.map(
            (
              example
            ) => (
              <button
                key={
                  example
                }
                type="button"
                disabled={
                  !caseId
                }
                onClick={() =>
                  setQuestion(
                    example
                  )
                }
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {example}
              </button>
            )
          )}
        </div>

        <button
          type="submit"
          disabled={
            !caseId ||
            !question.trim() ||
            loading
          }
          className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Searching..."
            : "Ask TRACE"}
        </button>
      </form>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 space-y-5 border-t border-slate-200 pt-7">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Grounded answer
              </p>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${confidenceClasses(
                  result.confidence
                )}`}
              >
                {
                  result.confidence
                }{" "}
                confidence
              </span>
            </div>

            <p className="mt-3 leading-7 text-slate-900">
              {result.answer}
            </p>
          </div>

          {result.evidence.length >
            0 && (
            <details className="rounded-xl border border-slate-200 bg-white">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">
                Supporting evidence (
                {
                  result.evidence
                    .length
                }
                )
              </summary>

              <div className="space-y-3 border-t border-slate-200 p-4">
                {result.evidence.map(
                  (
                    evidence
                  ) => {
                    const cleaned =
                      cleanEvidenceText(
                        evidence.content
                      );

                    return (
                      <article
                        key={
                          evidence.id
                        }
                        className="rounded-lg bg-slate-50 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {sourceTypeLabel(
                              evidence.sourceType
                            )}
                          </span>

                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {evidenceLocationLabel(
                              evidence
                            )}
                          </span>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-700">
                          {previewEvidence(
                            evidence.content
                          )}
                        </p>

                        {cleaned.length >
                          260 && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800">
                              View full
                              passage
                            </summary>

                            <p className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-sm leading-6 text-slate-700">
                              {
                                cleaned
                              }
                            </p>
                          </details>
                        )}
                      </article>
                    );
                  }
                )}
              </div>
            </details>
          )}

          {result.limitations.length >
            0 && (
            <details className="rounded-xl border border-amber-200 bg-amber-50">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-amber-900">
                Limitations
              </summary>

              <ul className="space-y-2 border-t border-amber-200 px-5 py-4 text-sm leading-6 text-amber-900">
                {result.limitations.map(
                  (
                    limitation,
                    index
                  ) => (
                    <li
                      key={
                        index
                      }
                    >
                      •{" "}
                      {
                        limitation
                      }
                    </li>
                  )
                )}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}