"use client";

import { useState } from "react";

type PublicCommentsAnalyzerProps = {
  caseId: string | null;
};

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

  indexedEvidenceCount?: number;
};

type ImportedComment = {
  id: string;
  title: string;
  text: string;
  attachmentUrl?: string;
};

type ImportSummary = {
  requested: number;
  ready: number;
  failed: number;
};

type RegulationsApiComment = {
  id: string;
  title?: string;
  analysisText?: string | null;
  readyForAnalysis?: boolean;
  attachmentUrl?: string;
  extractionError?: string;
};

export default function PublicCommentsAnalyzer({
  caseId,
}: PublicCommentsAnalyzerProps) {
  const [commentsText, setCommentsText] =
    useState("");

  const [
    importedComments,
    setImportedComments,
  ] = useState<ImportedComment[]>([]);

  const [
    importSummary,
    setImportSummary,
  ] = useState<ImportSummary | null>(
    null
  );

  const [
    importingComments,
    setImportingComments,
  ] = useState(false);

  const [
    importError,
    setImportError,
  ] = useState("");

  const [analysis, setAnalysis] =
    useState<CommentAnalysis | null>(
      null
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * Demo regulation:
   * EPA PFAS National Primary
   * Drinking Water Regulation
   */
  const PFAS_OBJECT_ID =
    "0900006485883ec6";

  const OFFICIAL_COMMENT_LIMIT = 5;

  function parseManualComments() {
    return commentsText
      .split("\n")
      .map((comment) =>
        comment.trim()
      )
      .filter(Boolean);
  }

  /*
   * Imported comments can contain
   * multiple pages. Keep each imported
   * submission as one comment.
   */
  const comments =
    importedComments.length > 0
      ? importedComments.map(
          (comment) =>
            comment.text
        )
      : parseManualComments();

  const commentCount =
    comments.length;

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

  /*
   * Regulations.gov PDF extraction can
   * include HTML fragments, page markers,
   * headers, and excessive whitespace.
   *
   * Clean those only for display.
   * The original text is still sent to
   * the analysis API and indexed.
   */
  function cleanCommentText(
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
        /PageHeader\s*=\s*["'][^"']*["']/gi,
        " "
      )
      .replace(
        /&nbsp;/gi,
        " "
      )
      .replace(
        /&amp;/gi,
        "&"
      )
      .replace(
        /&lt;/gi,
        "<"
      )
      .replace(
        /&gt;/gi,
        ">"
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();
  }

  function previewComment(
    text: string,
    maxLength = 300
  ) {
    const cleaned =
      cleanCommentText(text);

    if (
      cleaned.length <= maxLength
    ) {
      return cleaned;
    }

    return `${cleaned
      .slice(0, maxLength)
      .trim()}…`;
  }

  function stanceClasses(
    stance: Stance
  ) {
    switch (stance) {
      case "support":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";

      case "oppose":
        return "border-red-200 bg-red-50 text-red-700";

      case "mixed":
        return "border-purple-200 bg-purple-50 text-purple-700";

      default:
        return "border-slate-200 bg-slate-50 text-slate-600";
    }
  }

  async function handleLoadOfficialComments() {
    if (!caseId) {
      return;
    }

    setImportingComments(true);
    setImportError("");
    setError("");
    setAnalysis(null);

    try {
      const response =
        await fetch(
          `/api/regulations-comments?objectId=${PFAS_OBJECT_ID}&limit=${OFFICIAL_COMMENT_LIMIT}`
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to load official comments."
        );
      }

      const allComments:
        RegulationsApiComment[] =
        Array.isArray(
          data.comments
        )
          ? data.comments
          : [];

      const readyComments =
        allComments
          .filter(
            (
              comment
            ): comment is RegulationsApiComment & {
              analysisText: string;
            } =>
              Boolean(
                comment.readyForAnalysis &&
                  typeof comment.analysisText ===
                    "string" &&
                  comment.analysisText.trim()
              )
          )
          .map(
            (
              comment
            ): ImportedComment => ({
              id: comment.id,

              title:
                comment.title ??
                comment.id,

              text:
                comment.analysisText,

              attachmentUrl:
                comment.attachmentUrl,
            })
          );

      setImportedComments(
        readyComments
      );

      /*
       * Switch away from manual mode
       * when official comments load.
       */
      setCommentsText("");

      setImportSummary({
        requested:
          allComments.length,

        ready:
          readyComments.length,

        failed:
          allComments.length -
          readyComments.length,
      });

      if (
        readyComments.length === 0
      ) {
        setImportError(
          "No Regulations.gov comments could be prepared for analysis."
        );
      }
    } catch (caughtError) {
      console.error(
        "Official comment import error:",
        caughtError
      );

      setImportError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load official comments."
      );
    } finally {
      setImportingComments(false);
    }
  }

  async function handleAnalyze() {
    if (
      !caseId ||
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
              caseId,
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
    } catch (caughtError) {
      console.error(
        "Comment analysis error:",
        caughtError
      );

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to analyze comments."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          Public sentiment
        </p>

        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Public Comments
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Analyze official public
          comments and identify expressed
          stance, recurring concerns, and
          evidence-backed themes.
        </p>
      </div>

      {/* Case status */}

      {!caseId && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Upload a policy PDF first to
          create a TRACE case.
        </div>
      )}

      {caseId && (
        <div className="mt-5 flex items-center gap-2 text-sm text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />

          Connected to the current TRACE
          case
        </div>
      )}

      {/* Regulations.gov */}

      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-slate-900">
              Regulations.gov
            </p>

            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">
              Import official comments
              for the EPA PFAS National
              Primary Drinking Water
              Regulation.
            </p>
          </div>

          <button
            type="button"
            onClick={
              handleLoadOfficialComments
            }
            disabled={
              !caseId ||
              importingComments ||
              loading
            }
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importingComments
              ? "Loading..."
              : "Load official comments"}
          </button>
        </div>

        {importSummary && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white px-3 py-1.5 font-semibold text-blue-700">
              {
                importSummary.ready
              }{" "}
              ready
            </span>

            {importSummary.failed >
              0 && (
              <span className="rounded-full bg-white px-3 py-1.5 font-semibold text-amber-700">
                {
                  importSummary.failed
                }{" "}
                skipped
              </span>
            )}
          </div>
        )}

        {importError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {importError}
          </div>
        )}
      </div>

      {/* Imported sources */}

      {importedComments.length >
        0 && (
        <details className="mt-4 rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
            Imported comments (
            {
              importedComments.length
            }
            )
          </summary>

          <div className="border-t border-slate-200 p-4">
            <div className="space-y-2">
              {importedComments.map(
                (comment) => (
                  <div
                    key={comment.id}
                    className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {
                          comment.title
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {comment.id}
                      </p>
                    </div>

                    {comment.attachmentUrl && (
                      <a
                        href={
                          comment.attachmentUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-xs font-semibold text-blue-600 hover:underline"
                      >
                        View source
                      </a>
                    )}
                  </div>
                )
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setImportedComments(
                  []
                );

                setImportSummary(
                  null
                );

                setImportError("");

                setAnalysis(null);
              }}
              className="mt-4 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Clear imported comments
            </button>
          </div>
        </details>
      )}

      {/* Manual comments */}

      <details className="mt-4 rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
          Enter comments manually
        </summary>

        <div className="border-t border-slate-200 p-4">
          <p className="mb-3 text-xs leading-5 text-slate-500">
            Enter one comment per line.
            Manual input replaces imported
            comments.
          </p>

          <textarea
            value={commentsText}
            onChange={(event) => {
              setCommentsText(
                event.target.value
              );

              if (
                importedComments.length >
                0
              ) {
                setImportedComments(
                  []
                );

                setImportSummary(
                  null
                );

                setImportError("");
              }

              setAnalysis(null);
            }}
            disabled={!caseId}
            placeholder={`I support the proposal because it will improve access to services.
The policy will be too expensive for small organizations to implement.
I support the overall goal, but the compliance deadline is too short.`}
            className="min-h-40 w-full rounded-xl border border-slate-300 p-4 text-sm outline-none transition focus:border-blue-500 disabled:bg-slate-100"
          />
        </div>
      </details>

      {/* Analyze */}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={
            !caseId ||
            loading ||
            importingComments ||
            commentCount === 0
          }
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Analyzing..."
            : "Analyze Public Sentiment"}
        </button>

        {commentCount > 0 && (
          <p className="text-sm text-slate-500">
            {commentCount} comment
            {commentCount === 1
              ? ""
              : "s"}{" "}
            ready
          </p>
        )}
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}

      {analysis && (
        <div className="mt-8 space-y-8 border-t border-slate-200 pt-7">
          {/* Sample status */}

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
              {
                analysis.sampleSize
              }{" "}
              submitted comments
            </span>

            {typeof analysis.indexedEvidenceCount ===
              "number" && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                {
                  analysis.indexedEvidenceCount
                }{" "}
                indexed
              </span>
            )}
          </div>

          {/* Stance */}

          <div>
            <h3 className="text-lg font-semibold text-slate-950">
              Expressed stance
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Counts describe only the
              submitted sample.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Support
                </p>

                <p className="mt-2 text-2xl font-bold text-emerald-900">
                  {
                    analysis
                      .stanceCounts
                      .support
                  }
                </p>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                  Oppose
                </p>

                <p className="mt-2 text-2xl font-bold text-red-900">
                  {
                    analysis
                      .stanceCounts
                      .oppose
                  }
                </p>
              </div>

              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                  Mixed
                </p>

                <p className="mt-2 text-2xl font-bold text-purple-900">
                  {
                    analysis
                      .stanceCounts
                      .mixed
                  }
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Neutral
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {
                    analysis
                      .stanceCounts
                      .neutral
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Themes */}

          <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  Concern & Issue
                  Themes
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Key patterns identified
                  in the submitted
                  comments.
                </p>
              </div>

              <span className="text-xs font-medium text-slate-500">
                {
                  analysis.themes
                    .length
                }{" "}
                theme
                {analysis.themes
                  .length === 1
                  ? ""
                  : "s"}
              </span>
            </div>

            <div className="mt-4 space-y-4">
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
                      className="rounded-xl border border-slate-200 bg-white p-5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-slate-950">
                          {
                            theme.label
                          }
                        </h4>

                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
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
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            Less common
                          </span>
                        )}
                      </div>

                      <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
                        {
                          theme.summary
                        }
                      </p>

                      {evidence.length >
                        0 && (
                        <details className="mt-4 border-t border-slate-100 pt-4">
                          <summary className="cursor-pointer text-sm font-semibold text-blue-600">
                            View supporting
                            comments (
                            {
                              evidence.length
                            }
                            )
                          </summary>

                          <div className="mt-4 space-y-3">
                            {evidence.map(
                              (
                                item
                              ) => {
                                const cleaned =
                                  cleanCommentText(
                                    item.text
                                  );

                                return (
                                  <div
                                    key={
                                      item.id
                                    }
                                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                                  >
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-xs font-semibold text-blue-700">
                                        {
                                          item.id
                                        }
                                      </span>

                                      <span
                                        className={`rounded-full border px-2 py-1 text-xs font-semibold capitalize ${stanceClasses(
                                          item.stance
                                        )}`}
                                      >
                                        {
                                          item.stance
                                        }
                                      </span>
                                    </div>

                                    <p className="mt-3 text-sm leading-6 text-slate-700">
                                      {previewComment(
                                        item.text
                                      )}
                                    </p>

                                    {cleaned.length >
                                      300 && (
                                      <details className="mt-3">
                                        <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800">
                                          View full
                                          comment
                                        </summary>

                                        <p className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-sm leading-6 text-slate-700">
                                          {
                                            cleaned
                                          }
                                        </p>
                                      </details>
                                    )}

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
                                              className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-500"
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

          {/* Full evidence */}

          {analysis.evidence.length >
            0 && (
            <details className="rounded-xl border border-slate-200 bg-white">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
                All comment evidence (
                {
                  analysis.evidence
                    .length
                }
                )
              </summary>

              <div className="space-y-3 border-t border-slate-200 p-4">
                {analysis.evidence.map(
                  (item) => {
                    const cleaned =
                      cleanCommentText(
                        item.text
                      );

                    return (
                      <article
                        key={
                          item.id
                        }
                        className="rounded-lg bg-slate-50 p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-blue-700">
                            {
                              item.id
                            }
                          </span>

                          <span
                            className={`rounded-full border px-2 py-1 text-xs font-semibold capitalize ${stanceClasses(
                              item.stance
                            )}`}
                          >
                            {
                              item.stance
                            }
                          </span>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-700">
                          {previewComment(
                            item.text
                          )}
                        </p>

                        {cleaned.length >
                          300 && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800">
                              View full
                              comment
                            </summary>

                            <p className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-sm leading-6 text-slate-700">
                              {
                                cleaned
                              }
                            </p>
                          </details>
                        )}

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
                                  className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-500"
                                >
                                  {
                                    tag
                                  }
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </article>
                    );
                  }
                )}
              </div>
            </details>
          )}

          {/* Limitations */}

          {analysis.limitations.length >
            0 && (
            <details className="rounded-xl border border-amber-200 bg-amber-50">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-amber-900">
                Interpretation
                limitations
              </summary>

              <ul className="space-y-2 border-t border-amber-200 px-5 py-4 text-sm leading-6 text-amber-900">
                {analysis.limitations.map(
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
            Results summarize only the
            submitted comments and should
            not be treated as
            representative of the broader
            public.
          </p>
        </div>
      )}
    </section>
  );
}