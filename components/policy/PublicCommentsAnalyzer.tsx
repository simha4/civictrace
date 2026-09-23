"use client";

import { useState } from "react";

type Stance =
  | "support"
  | "oppose"
  | "neutral"
  | "mixed";

type Evidence = {
  id: string;
  text: string;
  stance: Stance;
  concernTags: string[];
};

type Theme = {
  label: string;
  summary: string;
  evidenceIds: string[];
  evidenceCount: number;
  lessCommon: boolean;
};

type CommentAnalysis = {
  sampleSize: number;

  stanceCounts: {
    support: number;
    oppose: number;
    neutral: number;
    mixed: number;
  };

  themes: Theme[];

  limitations: string[];

  evidence: Evidence[];
};

export default function PublicCommentsAnalyzer() {
  const [
    commentsText,
    setCommentsText,
  ] = useState("");

  const [
    analysis,
    setAnalysis,
  ] =
    useState<CommentAnalysis | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  function parseComments() {
    return commentsText
      .split("\n")
      .map((comment) =>
        comment.trim()
      )
      .filter(Boolean);
  }

  function getEvidenceForTheme(
    theme: Theme
  ) {
    if (!analysis) {
      return [];
    }

    return analysis.evidence.filter(
      (item) =>
        theme.evidenceIds.includes(
          item.id
        )
    );
  }

  function stanceClasses(
    stance: Stance
  ) {
    switch (stance) {
      case "support":
        return "bg-green-100 text-green-800";

      case "oppose":
        return "bg-red-100 text-red-800";

      case "mixed":
        return "bg-purple-100 text-purple-800";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  async function handleAnalyze() {
    const comments =
      parseComments();

    if (
      comments.length === 0
    ) {
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const response =
        await fetch(
          "/api/analyze-comments",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              comments,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to analyze comments."
        );
      }

      setAnalysis(data);
    } catch (error) {
      console.error(
        "Comment analysis error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to analyze comments."
      );
    } finally {
      setLoading(false);
    }
  }

  const commentCount =
    parseComments().length;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Public Sentiment Analysis
        </p>

        <h2 className="mt-2 text-2xl font-bold">
          Public Comments
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          Paste one public comment per line. CivicTrace classifies expressed
          stance, detects recurring concerns, and keeps each interpretation
          linked to the exact submitted comments.
        </p>
      </div>

      <textarea
        value={commentsText}
        onChange={(event) =>
          setCommentsText(
            event.target.value
          )
        }
        placeholder={`I support the proposal because it improves access.
The implementation cost is too high for small organizations.
I support the goal, but the compliance deadline is unrealistic.
I need more information before deciding.`}
        className="mt-6 min-h-48 w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-blue-500"
      />

      <div className="mt-3 text-sm text-gray-500">
        {commentCount} comments detected
      </div>

      <button
        type="button"
        onClick={
          handleAnalyze
        }
        disabled={
          loading ||
          commentCount === 0
        }
        className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Analyzing comments..."
          : "Analyze Public Sentiment"}
      </button>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {analysis && (
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold">
              Submitted Sample
            </h3>

            <p className="mt-2 text-sm text-gray-600">
              Analysis covers{" "}
              <span className="font-semibold">
                {
                  analysis.sampleSize
                }
              </span>{" "}
              submitted comments.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold">
              Expressed Stance
            </h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-800">
                  Support
                </p>

                <p className="mt-2 text-3xl font-bold text-green-900">
                  {
                    analysis
                      .stanceCounts
                      .support
                  }
                </p>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">
                  Oppose
                </p>

                <p className="mt-2 text-3xl font-bold text-red-900">
                  {
                    analysis
                      .stanceCounts
                      .oppose
                  }
                </p>
              </div>

              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                <p className="text-sm font-medium text-purple-800">
                  Mixed
                </p>

                <p className="mt-2 text-3xl font-bold text-purple-900">
                  {
                    analysis
                      .stanceCounts
                      .mixed
                  }
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700">
                  Neutral / unclear
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {
                    analysis
                      .stanceCounts
                      .neutral
                  }
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold">
              Concern &amp; Issue Themes
            </h3>

            <p className="mt-2 text-sm text-gray-600">
              Every theme is linked back to the submitted comments that
              support it.
            </p>

            <div className="mt-4 space-y-5">
              {analysis.themes.map(
                (
                  theme,
                  index
                ) => {
                  const evidence =
                    getEvidenceForTheme(
                      theme
                    );

                  return (
                    <article
                      key={`${theme.label}-${index}`}
                      className="rounded-xl border border-gray-200 p-5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold">
                          {
                            theme.label
                          }
                        </h4>

                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          {
                            theme.evidenceCount
                          }{" "}
                          comment
                          {theme.evidenceCount ===
                          1
                            ? ""
                            : "s"}
                        </span>

                        {theme.lessCommon && (
                          <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                            Less common in this sample
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-sm leading-6 text-gray-700">
                        {
                          theme.summary
                        }
                      </p>

                      <div className="mt-5 space-y-3">
                        {evidence.map(
                          (
                            item
                          ) => (
                            <div
                              key={
                                item.id
                              }
                              className="rounded-lg bg-gray-50 p-4"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-blue-700">
                                  {
                                    item.id
                                  }
                                </span>

                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${stanceClasses(
                                    item.stance
                                  )}`}
                                >
                                  {
                                    item.stance
                                  }
                                </span>
                              </div>

                              <blockquote className="mt-3 border-l-4 border-blue-500 pl-4 text-sm leading-6 text-gray-700">
                                {
                                  item.text
                                }
                              </blockquote>

                              {item
                                .concernTags
                                .length >
                                0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {item.concernTags.map(
                                    (
                                      tag
                                    ) => (
                                      <span
                                        key={
                                          tag
                                        }
                                        className="rounded-full bg-white px-2 py-1 text-xs text-gray-600"
                                      >
                                        {
                                          tag
                                        }
                                      </span>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold">
              Comment Evidence
            </h3>

            <div className="mt-4 space-y-3">
              {analysis.evidence.map(
                (item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-blue-700">
                        {item.id}
                      </span>

                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${stanceClasses(
                          item.stance
                        )}`}
                      >
                        {item.stance}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-gray-700">
                      {item.text}
                    </p>
                  </article>
                )
              )}
            </div>
          </div>

          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
            <h3 className="font-semibold text-yellow-900">
              Interpretation Limitations
            </h3>

            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-yellow-900">
              {analysis.limitations.map(
                (
                  limitation,
                  index
                ) => (
                  <li key={index}>
                    {limitation}
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}