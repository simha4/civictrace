"use client";

import { useState } from "react";

type SourceType =
  | "policy"
  | "public_comment"
  | "hearing";

type Evidence = {
  id: string;
  sourceType: SourceType;
  sourceTitle: string;
  pageNumber?: number;
  sequenceNumber?: number;
  speaker?: string;
  content: string;
};

type BriefItem = {
  statement: string;
  evidenceIds: string[];
};

type LeadershipBriefData = {
  executiveSummary: string;

  policySnapshot:
    BriefItem[];

  publicFeedback:
    BriefItem[];

  hearingThemes:
    BriefItem[];

  implementationIssues:
    BriefItem[];

  lessCommonViews:
    BriefItem[];

  limitations:
    string[];

  evidence:
    Evidence[];

  evidenceCount:
    number;
};

type LeadershipBriefProps = {
  caseId: string | null;
  sourceTitle: string | null;
};

export default function LeadershipBrief({
  caseId,
  sourceTitle,
}: LeadershipBriefProps) {
  const [
    brief,
    setBrief,
  ] =
    useState<LeadershipBriefData | null>(
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

  function getEvidence(
    evidenceIds: string[]
  ) {
    if (!brief) {
      return [];
    }

    return brief.evidence.filter(
      (item) =>
        evidenceIds.includes(
          item.id
        )
    );
  }

  function sourceLabel(
    evidence: Evidence
  ) {
    if (
      evidence.sourceType ===
      "policy"
    ) {
      return typeof evidence.pageNumber ===
        "number"
        ? `Policy · Page ${evidence.pageNumber}`
        : "Policy";
    }

    if (
      evidence.sourceType ===
      "public_comment"
    ) {
      return typeof evidence.sequenceNumber ===
        "number"
        ? `Public comment · Comment ${evidence.sequenceNumber}`
        : "Public comment";
    }

    const parts = [
      "Hearing",
    ];

    if (
      evidence.speaker
    ) {
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

    return parts.join(
      " · "
    );
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
    maxLength = 240
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

  async function generateBrief() {
    if (!caseId) {
      return;
    }

    setLoading(true);
    setError("");
    setBrief(null);

    try {
      const response =
        await fetch(
          "/api/generate-brief",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                caseId,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to generate leadership brief."
        );
      }

      setBrief(data);
    } catch (caughtError) {
      console.error(
        "Leadership brief error:",
        caughtError
      );

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to generate leadership brief."
      );
    } finally {
      setLoading(false);
    }
  }

  function renderSection(
    title: string,
    items: BriefItem[]
  ) {
    if (
      items.length === 0
    ) {
      return null;
    }

    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-950">
            {title}
          </h3>

          <span className="text-xs font-medium text-slate-500">
            {items.length} item
            {items.length === 1
              ? ""
              : "s"}
          </span>
        </div>

        <div className="mt-3 space-y-3">
          {items.map(
            (
              item,
              index
            ) => {
              const evidence =
                getEvidence(
                  item.evidenceIds
                );

              return (
                <article
                  key={`${title}-${index}`}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                      {index + 1}
                    </div>

                    <p className="text-sm font-medium leading-6 text-slate-900">
                      {
                        item.statement
                      }
                    </p>
                  </div>

                  {evidence.length >
                    0 && (
                    <details className="mt-3 border-t border-slate-100 pt-3">
                      <summary className="cursor-pointer text-sm font-semibold text-blue-600">
                        Supporting evidence (
                        {
                          evidence.length
                        }
                        )
                      </summary>

                      <div className="mt-3 space-y-3">
                        {evidence.map(
                          (
                            evidenceItem
                          ) => {
                            const cleaned =
                              cleanEvidenceText(
                                evidenceItem.content
                              );

                            return (
                              <div
                                key={
                                  evidenceItem.id
                                }
                                className="rounded-lg bg-slate-50 p-4"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                    {sourceLabel(
                                      evidenceItem
                                    )}
                                  </span>

                                  <span className="max-w-full truncate text-xs text-slate-500">
                                    {
                                      evidenceItem.sourceTitle
                                    }
                                  </span>
                                </div>

                                <p className="mt-3 text-sm leading-6 text-slate-700">
                                  {previewEvidence(
                                    evidenceItem.content
                                  )}
                                </p>

                                {cleaned.length >
                                  240 && (
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
                              </div>
                            );
                          }
                        )}
                      </div>
                    </details>
                  )}
                </article>
              );
            }
          )}
        </div>
      </div>
    );
  }

  function renderCollapsedSection(
    title: string,
    items: BriefItem[]
  ) {
    if (
      items.length === 0
    ) {
      return null;
    }

    return (
      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">
          {title} (
          {items.length})
        </summary>

        <div className="space-y-3 border-t border-slate-200 p-4">
          {items.map(
            (
              item,
              index
            ) => {
              const evidence =
                getEvidence(
                  item.evidenceIds
                );

              return (
                <article
                  key={`${title}-${index}`}
                  className="rounded-lg bg-slate-50 p-4"
                >
                  <p className="text-sm font-medium leading-6 text-slate-900">
                    {
                      item.statement
                    }
                  </p>

                  {evidence.length >
                    0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-blue-600">
                        Supporting evidence (
                        {
                          evidence.length
                        }
                        )
                      </summary>

                      <div className="mt-3 space-y-3">
                        {evidence.map(
                          (
                            evidenceItem
                          ) => {
                            const cleaned =
                              cleanEvidenceText(
                                evidenceItem.content
                              );

                            return (
                              <div
                                key={
                                  evidenceItem.id
                                }
                                className="rounded-lg border border-slate-200 bg-white p-3"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                    {sourceLabel(
                                      evidenceItem
                                    )}
                                  </span>

                                  <span className="text-xs text-slate-500">
                                    {
                                      evidenceItem.sourceTitle
                                    }
                                  </span>
                                </div>

                                <p className="mt-3 text-sm leading-6 text-slate-700">
                                  {previewEvidence(
                                    evidenceItem.content
                                  )}
                                </p>

                                {cleaned.length >
                                  240 && (
                                  <details className="mt-3">
                                    <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800">
                                      View full
                                      passage
                                    </summary>

                                    <p className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                                      {
                                        cleaned
                                      }
                                    </p>
                                  </details>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>
                    </details>
                  )}
                </article>
              );
            }
          )}
        </div>
      </details>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          Unified evidence brief
        </p>

        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Leadership Brief
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Generate a concise,
          evidence-grounded summary
          across policy, public
          comments, and hearing
          testimony.
        </p>
      </div>

      {caseId ? (
        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />

          Using evidence from
          the current TRACE case

          {sourceTitle && (
            <>
              <span className="text-emerald-400">
                ·
              </span>

              <span className="font-medium">
                {
                  sourceTitle
                }
              </span>
            </>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Upload a policy PDF
          first to create a
          TRACE case.
        </div>
      )}

      <button
        type="button"
        onClick={
          generateBrief
        }
        disabled={
          !caseId ||
          loading
        }
        className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Generating..."
          : "Generate Leadership Brief"}
      </button>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {brief && (
        <div className="mt-8 space-y-7 border-t border-slate-200 pt-7">
          {/* Executive summary */}

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Executive summary
              </p>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">
                {
                  brief.evidenceCount
                }{" "}
                evidence items
              </span>
            </div>

            <p className="mt-3 max-w-5xl leading-7 text-slate-900">
              {
                brief.executiveSummary
              }
            </p>
          </div>

          {/* Core sections */}

          {renderSection(
            "Policy Snapshot",
            brief.policySnapshot
          )}

          {renderSection(
            "Public Feedback",
            brief.publicFeedback
          )}

          {renderSection(
            "Hearing Themes",
            brief.hearingThemes
          )}

          {renderSection(
            "Implementation Issues",
            brief.implementationIssues
          )}

          {/* Secondary sections */}

          {renderCollapsedSection(
            "Less-common Views in This Sample",
            brief.lessCommonViews
          )}

          {brief.limitations
            .length >
            0 && (
            <details className="rounded-xl border border-amber-200 bg-amber-50">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-amber-900">
                Limitations (
                {
                  brief.limitations
                    .length
                }
                )
              </summary>

              <ul className="space-y-2 border-t border-amber-200 px-5 py-4 text-sm leading-6 text-amber-900">
                {brief.limitations.map(
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

          <p className="text-xs leading-5 text-slate-500">
            TRACE summarizes
            indexed case evidence.
            Review supporting
            sources before relying
            on individual findings.
          </p>
        </div>
      )}
    </section>
  );
}