"use client";

import { useState } from "react";

type HearingAnalyzerProps = {
  caseId: string | null;
};

type HearingEvidence = {
  id: string;
  speaker: string;
  text: string;
};

type Theme = {
  label: string;
  summary: string;
  evidenceIds: string[];
};

type Insight = {
  type:
    | "concern"
    | "support"
    | "question"
    | "implementation_issue"
    | "possible_misunderstanding"
    | "other";

  claim: string;
  evidenceIds: string[];
};

type HearingAnalysis = {
  summary: string;
  themes: Theme[];
  insights: Insight[];
  limitations: string[];
  evidence: HearingEvidence[];
  indexedEvidenceCount?: number;
};

export default function HearingAnalyzer({
  caseId,
}: HearingAnalyzerProps) {
  const [
    transcriptText,
    setTranscriptText,
  ] = useState("");

  const [
    analysis,
    setAnalysis,
  ] =
    useState<HearingAnalysis | null>(
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

  function parseTranscript() {
    return transcriptText
      .split("\n")
      .map((line) =>
        line.trim()
      )
      .filter(Boolean)
      .map(
        (
          line,
          index
        ) => {
          const separatorIndex =
            line.indexOf(
              ":"
            );

          if (
            separatorIndex ===
            -1
          ) {
            return {
              id: `hearing-${index + 1}`,

              speaker:
                `Speaker ${index + 1}`,

              text: line,
            };
          }

          const speaker =
            line
              .slice(
                0,
                separatorIndex
              )
              .trim();

          const text =
            line
              .slice(
                separatorIndex +
                  1
              )
              .trim();

          return {
            id: `hearing-${index + 1}`,

            speaker:
              speaker ||
              `Speaker ${index + 1}`,

            text,
          };
        }
      )
      .filter(
        (item) =>
          item.text.length >
          0
      );
  }

  const transcript =
    parseTranscript();

  function getEvidence(
    evidenceIds: string[]
  ) {
    if (!analysis) {
      return [];
    }

    return analysis.evidence.filter(
      (item) =>
        evidenceIds.includes(
          item.id
        )
    );
  }

  async function analyzeHearing() {
    if (
      !caseId ||
      transcript.length ===
        0
    ) {
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const response =
        await fetch(
          "/api/analyze-hearing",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              caseId,
              transcript,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ??
            "Unable to analyze hearing."
        );
      }

      setAnalysis(
        data
      );
    } catch (error) {
      console.error(
        "Hearing analysis error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to analyze hearing."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
        Hearing Testimony Analysis
      </p>

      <h2 className="mt-2 text-2xl font-bold">
        Public Hearing Transcript
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
        Paste one speaker statement per line using the format
        &quot;Speaker: testimony&quot;. CivicTrace links every generated
        insight back to the exact speaker statement and adds that testimony to
        the same searchable policy case.
      </p>

      {!caseId && (
        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
          Upload a policy PDF first so this hearing testimony can be linked to
          the same CivicTrace case.
        </div>
      )}

      {caseId && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          This hearing testimony will be added to the current CivicTrace case.
        </div>
      )}

      <textarea
        value={
          transcriptText
        }
        onChange={(
          event
        ) =>
          setTranscriptText(
            event.target.value
          )
        }
        disabled={!caseId}
        placeholder={`Resident 1: I support the proposal because transit access will improve.
Business Owner: I am concerned about the implementation cost.
Resident 2: The deadline should be extended.
Agency Staff: The proposed implementation period is currently six months.`}
        className="mt-6 min-h-52 w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-blue-500 disabled:bg-gray-100"
      />

      <p className="mt-3 text-sm text-gray-500">
        {
          transcript.length
        }{" "}
        speaker statement
        {transcript.length ===
        1
          ? ""
          : "s"}{" "}
        detected
      </p>

      <button
        type="button"
        onClick={
          analyzeHearing
        }
        disabled={
          !caseId ||
          loading ||
          transcript.length ===
            0
        }
        className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Analyzing hearing..."
          : "Analyze Hearing"}
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
              Hearing Summary
            </h3>

            <p className="mt-3 leading-7 text-gray-700">
              {
                analysis.summary
              }
            </p>

            {typeof analysis.indexedEvidenceCount ===
              "number" && (
              <p className="mt-2 text-sm text-green-700">
                {
                  analysis.indexedEvidenceCount
                }{" "}
                hearing evidence item
                {analysis.indexedEvidenceCount === 1
                  ? ""
                  : "s"}{" "}
                added to Azure AI Search.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold">
              Hearing Themes
            </h3>

            <div className="mt-4 space-y-4">
              {analysis.themes.map(
                (
                  theme,
                  index
                ) => (
                  <article
                    key={`${theme.label}-${index}`}
                    className="rounded-xl border border-gray-200 p-5"
                  >
                    <h4 className="font-semibold">
                      {
                        theme.label
                      }
                    </h4>

                    <p className="mt-2 text-sm leading-6 text-gray-700">
                      {
                        theme.summary
                      }
                    </p>

                    <div className="mt-4 space-y-3">
                      {getEvidence(
                        theme.evidenceIds
                      ).map(
                        (
                          evidence
                        ) => (
                          <div
                            key={
                              evidence.id
                            }
                            className="rounded-lg bg-gray-50 p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-blue-700">
                                {
                                  evidence.id
                                }
                              </span>

                              <span className="text-sm font-semibold">
                                {
                                  evidence.speaker
                                }
                              </span>
                            </div>

                            <blockquote className="mt-3 border-l-4 border-blue-500 pl-4 text-sm leading-6 text-gray-700">
                              {
                                evidence.text
                              }
                            </blockquote>
                          </div>
                        )
                      )}
                    </div>
                  </article>
                )
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold">
              Evidence-grounded Insights
            </h3>

            <div className="mt-4 space-y-4">
              {analysis.insights.map(
                (
                  insight,
                  index
                ) => (
                  <article
                    key={`${insight.type}-${index}`}
                    className="rounded-xl border border-gray-200 p-5"
                  >
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                      {insight.type.replaceAll(
                        "_",
                        " "
                      )}
                    </span>

                    <p className="mt-4 font-medium leading-7">
                      {
                        insight.claim
                      }
                    </p>

                    <div className="mt-4 space-y-3">
                      {getEvidence(
                        insight.evidenceIds
                      ).map(
                        (
                          evidence
                        ) => (
                          <div
                            key={
                              evidence.id
                            }
                            className="rounded-lg bg-gray-50 p-4"
                          >
                            <p className="text-sm font-semibold">
                              {
                                evidence.speaker
                              }
                            </p>

                            <p className="mt-2 text-sm leading-6 text-gray-700">
                              {
                                evidence.text
                              }
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </article>
                )
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold">
              Speaker Evidence
            </h3>

            <div className="mt-4 space-y-3">
              {analysis.evidence.map(
                (
                  evidence
                ) => (
                  <article
                    key={
                      evidence.id
                    }
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-blue-700">
                        {
                          evidence.id
                        }
                      </span>

                      <span className="font-semibold">
                        {
                          evidence.speaker
                        }
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-gray-700">
                      {
                        evidence.text
                      }
                    </p>
                  </article>
                )
              )}
            </div>
          </div>

          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
            <h3 className="font-semibold text-yellow-900">
              Limitations
            </h3>

            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-yellow-900">
              {analysis.limitations.map(
                (
                  limitation,
                  index
                ) => (
                  <li key={index}>
                    {
                      limitation
                    }
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