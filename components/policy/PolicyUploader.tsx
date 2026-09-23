"use client";

import {
  useState,
} from "react";

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

  stakeholderGroups:
    string[];

  requirements:
    AnalysisItem[];

  facts:
    AnalysisItem[];

  confidence:
    "high" | "medium" | "low";

  limitations:
    string[];

  evidence:
    AnalysisEvidence[];
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
    useState<File | null>(
      null
    );

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
  ] =
    useState(false);

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

      // Upload + Document Intelligence + Azure Search indexing
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

      // Existing Foundry document analysis
      const analysisResponse =
        await fetch(
          "/api/analyze-document",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
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
    } catch (error) {
      console.error(
        "Policy upload error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to process the PDF."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Document Intelligence + Azure AI Search
        </p>

        <h2 className="mt-2 text-2xl font-bold">
          Upload Policy Document
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          Upload a PDF. CivicTrace extracts page-aware text with Azure
          Document Intelligence, indexes the evidence in Azure AI Search,
          and analyzes the document with Microsoft Foundry.
        </p>
      </div>

      <div className="mt-6">
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
          className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm"
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
          className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Processing & indexing..."
            : "Upload & Analyze"}
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {uploadResult && (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="font-semibold text-green-900">
            Document ready
          </p>

          <div className="mt-3 space-y-1 text-sm text-green-900">
            <p>
              File:{" "}
              {
                uploadResult.fileName
              }
            </p>

            <p>
              Pages extracted:{" "}
              {
                uploadResult.pageCount
              }
            </p>

            <p>
              Evidence pages indexed:{" "}
              {
                uploadResult.indexedEvidenceCount
              }
            </p>
          </div>

          <p className="mt-3 text-xs text-green-800">
            This document can now be queried through Ask CivicTrace.
          </p>
        </div>
      )}

      {analysis && (
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold">
              Document Summary
            </h3>

            <p className="mt-3 leading-7 text-gray-700">
              {
                analysis.summary
              }
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold">
              Stakeholder Groups
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
                    className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700"
                  >
                    {
                      stakeholder
                    }
                  </span>
                )
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold">
              Requirements
            </h3>

            <div className="mt-4 space-y-4">
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
                      className="rounded-xl border border-gray-200 p-5"
                    >
                      <p className="font-medium">
                        {
                          requirement.statement
                        }
                      </p>

                      <div className="mt-4 space-y-3">
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
                              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                Page{" "}
                                {
                                  item.pageNumber
                                }
                              </p>

                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                                {
                                  item.text
                                }
                              </p>
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
              Document Facts
            </h3>

            <div className="mt-4 space-y-4">
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
                    <article
                      key={
                        index
                      }
                      className="rounded-xl border border-gray-200 p-5"
                    >
                      <p className="font-medium">
                        {
                          fact.statement
                        }
                      </p>

                      <div className="mt-4 space-y-3">
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
                              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                Page{" "}
                                {
                                  item.pageNumber
                                }
                              </p>

                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                                {
                                  item.text
                                }
                              </p>
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
              Confidence
            </h3>

            <p className="mt-2 capitalize">
              {
                analysis.confidence
              }
            </p>
          </div>

          {analysis.limitations.length >
            0 && (
            <div>
              <h3 className="text-lg font-semibold">
                Limitations
              </h3>

              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">
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
                      {
                        limitation
                      }
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm leading-6 text-yellow-900">
            AI-generated interpretation. Evidence page numbers and text are
            resolved from Azure Document Intelligence output rather than
            generated by the language model. Analysts should still verify
            conclusions against the original document.
          </div>
        </div>
      )}
    </section>
  );
}