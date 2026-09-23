"use client";

import { useState } from "react";

type SourceType =
  | "policy"
  | "public_comment"
  | "hearing";

type Evidence = {
  id: string;

  sourceType:
    SourceType;

  sourceTitle:
    string;

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

  sourceTitle:
    string | null;
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

            body: JSON.stringify({
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
    } catch (error) {
      console.error(
        "Leadership brief error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
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
        <h3 className="text-lg font-semibold">
          {title}
        </h3>

        <div className="mt-4 space-y-4">
          {items.map(
            (
              item,
              index
            ) => (
              <article
                key={`${title}-${index}`}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <p className="font-medium leading-7 text-gray-900">
                  {
                    item.statement
                  }
                </p>

                <div className="mt-4 space-y-3">
                  {getEvidence(
                    item.evidenceIds
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
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                            {sourceLabel(
                              evidence
                            )}
                          </span>

                          <span className="text-xs text-gray-500">
                            {
                              evidence.sourceTitle
                            }
                          </span>
                        </div>

                        <blockquote className="mt-3 border-l-4 border-blue-500 pl-4 text-sm leading-6 text-gray-700">
                          {
                            evidence.content
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
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
        Unified Evidence Brief
      </p>

      <h2 className="mt-2 text-2xl font-bold">
        Leadership Brief
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
        Generate a concise evidence-grounded brief across the policy document,
        submitted public comments, and hearing testimony.
      </p>

      {caseId ? (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Brief will use all evidence in the current CivicTrace case, anchored
          to{" "}
          <span className="font-semibold">
            {sourceTitle ??
              "the uploaded policy document"}
          </span>
          .
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
          Upload a policy PDF first to create a CivicTrace case.
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
        className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Generating brief..."
          : "Generate Leadership Brief"}
      </button>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {brief && (
        <div className="mt-8 space-y-8">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Executive Summary
            </p>

            <p className="mt-3 leading-7 text-gray-900">
              {
                brief.executiveSummary
              }
            </p>

            <p className="mt-3 text-xs text-blue-700">
              {
                brief.evidenceCount
              }{" "}
              indexed evidence items reviewed
            </p>
          </div>

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

          {renderSection(
            "Less-common Views in This Sample",
            brief.lessCommonViews
          )}

          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
            <h3 className="font-semibold text-yellow-900">
              Limitations
            </h3>

            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-yellow-900">
              {brief.limitations.map(
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

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-600">
            This brief is AI-generated from indexed case evidence. It summarizes
            the submitted record and does not make or recommend a policy
            decision. Analysts should review the cited source evidence before
            relying on individual conclusions.
          </div>
        </div>
      )}
    </section>
  );
}