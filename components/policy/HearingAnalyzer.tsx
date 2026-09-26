"use client";

import { useMemo, useState } from "react";

type Props = {
  caseId: string | null;
};

type HearingTheme = {
  label: string;
  summary: string;
  evidenceIds?: string[];
};

type HearingInsight = {
  type: string;
  claim?: string;
  statement?: string;
  summary?: string;
  evidenceIds?: string[];
};

type HearingEvidence = {
  id: string;
  speaker?: string;
  text?: string;
  content?: string;
};

type HearingAnalysis = {
  summary?: string;
  themes?: HearingTheme[];
  insights?: HearingInsight[];
  limitations?: string[];
  evidence?: HearingEvidence[];
  indexedEvidenceCount?: number;
};

type VideoImportResult = {
  caseId: string;
  videoId: string;
  youtubeUrl: string;

  source:
    | "serpapi-manual"
    | "serpapi-asr";

  languageCode:
    | string
    | null;

  durationSec: number;
  suspectedTruncation: boolean;
  snippetCount: number;
  segmentCount: number;
  transcriptText: string;

  segments?: Array<{
    id: string;
    sequenceNumber: number;
    timestamp: string;
    startSec: number;
    endSec: number;
    text: string;
  }>;
};

type TranscriptItem = {
  id: string;
  speaker: string;
  text: string;
};

function parseTranscript(
  transcript: string
): TranscriptItem[] {
  return transcript
    .split("\n")
    .map((line) =>
      line.trim()
    )
    .filter(Boolean)
    .map((line, index) => {
      /*
       * Expected formats:
       *
       * Resident 1: I support...
       *
       * Video Segment 1: [0:00] transcript...
       *
       * We split only on the FIRST colon so timestamps
       * such as [25:34] remain inside the testimony text.
       */
      const separatorIndex =
        line.indexOf(":");

      if (
        separatorIndex <= 0
      ) {
        return {
          id:
            `hearing-${index + 1}`,

          speaker:
            `Statement ${index + 1}`,

          text:
            line,
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
            separatorIndex + 1
          )
          .trim();

      return {
        id:
          `hearing-${index + 1}`,

        speaker:
          speaker ||
          `Statement ${index + 1}`,

        text:
          text || line,
      };
    });
}

export default function HearingAnalyzer({
  caseId,
}: Props) {
  const [
    transcript,
    setTranscript,
  ] = useState("");

  const [
    youtubeUrl,
    setYoutubeUrl,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    importingVideo,
    setImportingVideo,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    analysis,
    setAnalysis,
  ] =
    useState<HearingAnalysis | null>(
      null
    );

  const [
    videoImport,
    setVideoImport,
  ] =
    useState<VideoImportResult | null>(
      null
    );

  const transcriptItems =
    useMemo(
      () =>
        parseTranscript(
          transcript
        ),
      [transcript]
    );

  async function handleImportVideo() {
    if (!caseId) {
      setError(
        "Upload a policy document first so the hearing can be attached to the current TRACE case."
      );

      return;
    }

    if (
      !youtubeUrl.trim()
    ) {
      setError(
        "Enter a YouTube hearing URL."
      );

      return;
    }

    setImportingVideo(
      true
    );

    setError(null);
    setAnalysis(null);
    setVideoImport(null);

    try {
      const response =
        await fetch(
          "/api/import-hearing-video",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                caseId,

                youtubeUrl:
                  youtubeUrl.trim(),
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to import the hearing video."
        );
      }

      const imported =
        data as VideoImportResult;

      setVideoImport(
        imported
      );

      /*
       * The imported transcript is deliberately
       * loaded into the same workspace used for
       * manually entered testimony.
       *
       * Example:
       *
       * Video Segment 1: [0:00] ...
       * Video Segment 2: [0:44] ...
       */
      setTranscript(
        imported.transcriptText
      );
    } catch (error) {
      setError(
        error instanceof
        Error
          ? error.message
          : "Unable to import the hearing video."
      );
    } finally {
      setImportingVideo(
        false
      );
    }
  }

  async function handleAnalyze() {
    if (!caseId) {
      setError(
        "Upload a policy document first so the hearing analysis can be connected to the current case."
      );

      return;
    }

    if (
      transcriptItems.length ===
      0
    ) {
      setError(
        "Enter or import hearing testimony first."
      );

      return;
    }

    /*
     * This mirrors the backend schema:
     *
     * transcript:
     * [
     *   {
     *     id: string,
     *     speaker: string,
     *     text: string
     *   }
     * ]
     */
    if (
      transcriptItems.length >
      200
    ) {
      setError(
        "The hearing contains more than 200 statements. Please reduce the transcript before analysis."
      );

      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response =
        await fetch(
          "/api/analyze-hearing",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                caseId,

                transcript:
                  transcriptItems,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to analyze hearing testimony."
        );
      }

      setAnalysis(
        data
      );
    } catch (error) {
      setError(
        error instanceof
        Error
          ? error.message
          : "Unable to analyze hearing testimony."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
          Public Hearing
        </p>

        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Public Hearing Transcript
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Import a public hearing
          from YouTube or paste
          testimony manually.
          TRACE analyzes the
          hearing and adds the
          evidence to the current
          policy case.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-slate-950">
            Import from YouTube
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            Enter a public hearing
            YouTube URL. TRACE
            will load the available
            transcript and place it
            in the hearing workspace
            below.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <input
            type="url"
            value={
              youtubeUrl
            }
            onChange={(
              event
            ) =>
              setYoutubeUrl(
                event.target
                  .value
              )
            }
            placeholder="https://www.youtube.com/watch?v=..."
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500"
          />

          <button
            type="button"
            onClick={
              handleImportVideo
            }
            disabled={
              importingVideo ||
              !caseId
            }
            className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importingVideo
              ? "Loading transcript..."
              : "Load from YouTube"}
          </button>
        </div>

        {!caseId && (
          <p className="mt-3 text-sm text-amber-700">
            Upload a policy
            document first to
            create a TRACE
            case.
          </p>
        )}

        {videoImport && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-white p-3 text-sm text-slate-700">
            <p className="font-medium text-slate-900">
              YouTube transcript
              loaded
            </p>

            <p className="mt-1">
              {
                videoImport.segmentCount
              }{" "}
              transcript segments
              loaded from{" "}
              {videoImport.source ===
              "serpapi-manual"
                ? "manual captions"
                : "auto-generated captions"}
              .
            </p>

            {videoImport.languageCode && (
              <p className="mt-1 text-xs text-slate-500">
                Transcript
                language:{" "}
                {
                  videoImport.languageCode
                }
              </p>
            )}

            {videoImport.suspectedTruncation && (
              <p className="mt-2 font-medium text-amber-700">
                Warning: this
                transcript appears
                unusually short.
                Verify the source
                video before relying
                on the analysis.
              </p>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-4">
          <label
            htmlFor="hearing-transcript"
            className="block text-sm font-medium text-slate-800"
          >
            Hearing testimony
          </label>

          <span className="text-xs text-slate-500">
            {
              transcriptItems.length
            }{" "}
            statement
            {transcriptItems.length ===
            1
              ? ""
              : "s"}{" "}
            detected
          </span>
        </div>

        <textarea
          id="hearing-transcript"
          value={transcript}
          onChange={(
            event
          ) =>
            setTranscript(
              event.target
                .value
            )
          }
          rows={14}
          placeholder={`Resident 1: I support the proposal because...
Business Owner: I am concerned about implementation costs.
Agency Staff: The implementation period is six months.`}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-500"
        />

        <p className="mt-2 text-xs text-slate-500">
          Manual input format:
          one statement per line
          using{" "}
          <span className="font-medium">
            Speaker: testimony
          </span>
          .
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={
          handleAnalyze
        }
        disabled={
          loading ||
          !caseId ||
          transcriptItems.length ===
            0
        }
        className="mt-5 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Analyzing hearing..."
          : "Analyze Hearing"}
      </button>

      {analysis && (
        <div className="mt-8 space-y-7 border-t border-slate-200 pt-7">
          {analysis.summary && (
            <div>
              <h3 className="text-lg font-semibold text-slate-950">
                Hearing Summary
              </h3>

              <p className="mt-2 leading-7 text-slate-700">
                {
                  analysis.summary
                }
              </p>
            </div>
          )}

          {Array.isArray(
            analysis.themes
          ) &&
            analysis.themes
              .length >
              0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  Hearing Themes
                </h3>

                <div className="mt-3 grid gap-3">
                  {analysis.themes.map(
                    (
                      theme,
                      index
                    ) => (
                      <div
                        key={
                          `${theme.label}-${index}`
                        }
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <p className="font-medium text-slate-950">
                          {
                            theme.label
                          }
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-700">
                          {
                            theme.summary
                          }
                        </p>

                        {theme.evidenceIds &&
                          theme
                            .evidenceIds
                            .length >
                            0 && (
                            <p className="mt-2 text-xs text-slate-500">
                              {
                                theme
                                  .evidenceIds
                                  .length
                              }{" "}
                              supporting
                              evidence{" "}
                              {theme
                                .evidenceIds
                                .length ===
                              1
                                ? "item"
                                : "items"}
                            </p>
                          )}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          {Array.isArray(
            analysis.insights
          ) &&
            analysis.insights
              .length >
              0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  Hearing Insights
                </h3>

                <div className="mt-3 grid gap-3">
                  {analysis.insights.map(
                    (
                      insight,
                      index
                    ) => (
                      <div
                        key={
                          `${insight.type}-${index}`
                        }
                        className="rounded-xl border border-slate-200 bg-white p-4"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                          {
                            insight.type
                          }
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-800">
                          {insight.claim ??
                            insight.statement ??
                            insight.summary ??
                            "Hearing insight"}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          {Array.isArray(
            analysis.evidence
          ) &&
            analysis.evidence
              .length >
              0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  Evidence
                </h3>

                <div className="mt-3 space-y-3">
                  {analysis.evidence.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={
                          item.id ??
                          index
                        }
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {item.speaker ??
                            `Statement ${index + 1}`}
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {item.text ??
                            item.content ??
                            ""}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          {typeof analysis.indexedEvidenceCount ===
            "number" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              {
                analysis.indexedEvidenceCount
              }{" "}
              hearing evidence{" "}
              {analysis.indexedEvidenceCount ===
              1
                ? "item"
                : "items"}{" "}
              added to Azure AI
              Search.
            </div>
          )}

          {Array.isArray(
            analysis.limitations
          ) &&
            analysis.limitations
              .length >
              0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  Limitations
                </h3>

                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
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
              </div>
            )}
        </div>
      )}
    </section>
  );
}
