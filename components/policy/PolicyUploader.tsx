"use client";

import { useState } from "react";

type ExtractedPage = {
  pageNumber: number;
  text: string;
};

type UploadResult = {
  caseId: string;
  fileName: string;
  fileSize: number;
  content: string;
  pages: ExtractedPage[];
  pageCount: number;
  indexedEvidenceCount: number;
};

type AnalysisEvidence = {
  id: string;
  pageNumber: number;
  text: string;
};

type AnalysisItem = {
  statement: string;
  evidenceIds: string[];
};

type DocumentAnalysis = {
  summary: string;
  stakeholderGroups: string[];
  requirements: AnalysisItem[];
  facts: AnalysisItem[];
  confidence: "high" | "medium" | "low";
  limitations: string[];
  evidence: AnalysisEvidence[];
};

type PolicyUploaderProps = {
  onIndexed?: (
    caseId: string,
    fileName: string
  ) => void;
};

export default function PolicyUploader({
  onIndexed,
}: PolicyUploaderProps) {
  const [file, setFile] =
    useState<File | null>(null);

  const [
    uploadResult,
    setUploadResult,
  ] =
    useState<UploadResult | null>(
      null
    );

  const [
    analysis,
    setAnalysis,
  ] =
    useState<DocumentAnalysis | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [error, setError] =
    useState("");

  function getEvidenceForItem(
    item: AnalysisItem
  ) {
    if (!analysis) {
      return [];
    }

    return analysis.evidence.filter(
      (evidence) =>
        item.evidenceIds.includes(
          evidence.id
        )
    );
  }

  function confidenceClasses(
    confidence: DocumentAnalysis["confidence"]
  ) {
    if (confidence === "high") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }

    if (confidence === "medium") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }

    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  async function handleUpload() {
    if (!file) {
      return;
    }

    setLoading(true);
    setError("");
    setUploadResult(null);
    setAnalysis(null);

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const uploadResponse =
        await fetch(
          "/api/upload-policy",
          {
            method: "POST",
            body: formData,
          }
        );

      const uploadData =
        await uploadResponse.json();

      if (
        !uploadResponse.ok
      ) {
        throw new Error(
          uploadData.error ??
            "Unable to upload document."
        );
      }

      const uploaded =
        uploadData as UploadResult;

      setUploadResult(
        uploaded
      );

      onIndexed?.(
        uploaded.caseId,
        uploaded.fileName
      );

      const analysisResponse =
        await fetch(
          "/api/analyze-document",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                pages:
                  uploaded.pages,
              }),
          }
        );

      const analysisData =
        await analysisResponse.json();

      if (
        !analysisResponse.ok
      ) {
        throw new Error(
          analysisData.error ??
            "Unable to analyze document."
        );
      }

      setAnalysis(
        analysisData
      );
    } catch (caughtError) {
      console.error(
        "Policy upload error:",
        caughtError
      );

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to process the PDF."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Policy document
          </p>

          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            Upload Policy
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Upload a PDF to extract page-aware evidence, index it in Azure AI Search,
            and generate a concise policy analysis.
          </p>
        </div>

        {uploadResult && (
          <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Document ready
          </span>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={(
            event
          ) => {
            const selectedFile =
              event.target
                .files?.[0] ??
              null;

            setFile(
              selectedFile
            );

            setUploadResult(
              null
            );

            setAnalysis(
              null
            );

            setError("");
          }}
          className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700"
        />

        <button
          type="button"
          onClick={
            handleUpload
          }
          disabled={
            !file ||
            loading
          }
          className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Processing..."
            : "Upload & Analyze"}
        </button>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {uploadResult && (
        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <span className="font-semibold text-emerald-900">
            {
              uploadResult.fileName
            }
          </span>

          <span className="rounded-full bg-white px-3 py-1 font-medium text-emerald-700">
            {
              uploadResult.pageCount
            }{" "}
            page
            {uploadResult.pageCount ===
            1
              ? ""
              : "s"}
          </span>

          <span className="rounded-full bg-white px-3 py-1 font-medium text-emerald-700">
            {
              uploadResult.indexedEvidenceCount
            }{" "}
            indexed
          </span>
        </div>
      )}

      {analysis && (
        <div className="mt-7 space-y-7 border-t border-slate-200 pt-7">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Policy summary
              </p>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${confidenceClasses(
                  analysis.confidence
                )}`}
              >
                {
                  analysis.confidence
                }{" "}
                confidence
              </span>
            </div>

            <p className="mt-3 leading-7 text-slate-800">
              {
                analysis.summary
              }
            </p>
          </div>

          {analysis
            .stakeholderGroups
            .length >
            0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-950">
                Stakeholder groups
              </h3>

              <div className="mt-3 flex flex-wrap gap-2">
                {analysis.stakeholderGroups.map(
                  (
                    stakeholder
                  ) => (
                    <span
                      key={
                        stakeholder
                      }
                      className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700"
                    >
                      {
                        stakeholder
                      }
                    </span>
                  )
                )}
              </div>
            </div>
          )}

          {analysis.requirements
            .length >
            0 && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-950">
                  Key requirements
                </h3>

                <span className="text-xs font-medium text-slate-500">
                  {
                    analysis
                      .requirements
                      .length
                  }{" "}
                  identified
                </span>
              </div>

              <div className="mt-3 space-y-3">
                {analysis.requirements.map(
                  (
                    requirement,
                    index
                  ) => {
                    const evidence =
                      getEvidenceForItem(
                        requirement
                      );

                    return (
                      <article
                        key={
                          index
                        }
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                            {index +
                              1}
                          </div>

                          <p className="text-sm font-medium leading-6 text-slate-900">
                            {
                              requirement.statement
                            }
                          </p>
                        </div>

                        {evidence.length >
                          0 && (
                          <details className="mt-3 border-t border-slate-200 pt-3">
                            <summary className="cursor-pointer text-sm font-semibold text-blue-600">
                              View supporting evidence
                            </summary>

                            <div className="mt-3 space-y-3">
                              {evidence.map(
                                (
                                  item
                                ) => (
                                  <div
                                    key={
                                      item.id
                                    }
                                    className="rounded-lg border border-slate-200 bg-white p-3"
                                  >
                                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                      Page{" "}
                                      {
                                        item.pageNumber
                                      }
                                    </p>

                                    <p className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                      {
                                        item.text
                                      }
                                    </p>
                                  </div>
                                )
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
          )}

          {analysis.facts.length >
            0 && (
            <details className="rounded-xl border border-slate-200 bg-white">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">
                Additional document facts (
                {
                  analysis
                    .facts
                    .length
                }
                )
              </summary>

              <div className="space-y-3 border-t border-slate-200 p-4">
                {analysis.facts.map(
                  (
                    fact,
                    index
                  ) => {
                    const evidence =
                      getEvidenceForItem(
                        fact
                      );

                    return (
                      <div
                        key={
                          index
                        }
                        className="rounded-lg bg-slate-50 p-4"
                      >
                        <p className="text-sm font-medium leading-6 text-slate-900">
                          {
                            fact.statement
                          }
                        </p>

                        {evidence.length >
                          0 && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-xs font-semibold text-blue-600">
                              Supporting evidence
                            </summary>

                            <div className="mt-3 space-y-3">
                              {evidence.map(
                                (
                                  item
                                ) => (
                                  <div
                                    key={
                                      item.id
                                    }
                                    className="rounded-lg border border-slate-200 bg-white p-3"
                                  >
                                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                      Page{" "}
                                      {
                                        item.pageNumber
                                      }
                                    </p>

                                    <p className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                      {
                                        item.text
                                      }
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </details>
          )}

          {analysis.limitations
            .length >
            0 && (
            <details className="rounded-xl border border-amber-200 bg-amber-50">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-amber-900">
                Limitations
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
            AI-generated interpretation. Page references and supporting text are
            resolved from extracted source evidence. Review the original document
            before relying on individual conclusions.
          </p>
        </div>
      )}
    </section>
  );
}