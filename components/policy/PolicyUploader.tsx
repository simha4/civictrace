"use client";

import { useState } from "react";

type ExtractedPage = {
  pageNumber: number;
  text: string;
};

type UploadResult = {
  fileName: string;
  fileSize: number;
  content: string;
  pages: ExtractedPage[];
  pageCount: number;
};

type Evidence = {
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
  evidence: Evidence[];
};

export default function PolicyUploader() {
  const [file, setFile] = useState<File | null>(null);

  const [result, setResult] =
    useState<UploadResult | null>(null);

  const [analysis, setAnalysis] =
    useState<DocumentAnalysis | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function uploadAndAnalyze() {
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);
    setAnalysis(null);

    try {
      // STEP 1:
      // Upload PDF and extract page-aware content
      const formData = new FormData();

      formData.append("file", file);

      const uploadResponse = await fetch(
        "/api/upload-policy",
        {
          method: "POST",
          body: formData,
        }
      );

      const uploadData =
        await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(
          uploadData.error ??
            "Document extraction failed"
        );
      }

      setResult(uploadData);

      // STEP 2:
      // Send extracted pages to Foundry
      const analysisResponse = await fetch(
        "/api/analyze-document",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            pages: uploadData.pages,
          }),
        }
      );

      const analysisData =
        await analysisResponse.json();

      if (!analysisResponse.ok) {
        throw new Error(
          analysisData.error ??
            "Document analysis failed"
        );
      }

      setAnalysis(analysisData);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to process document."
      );
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
        CivicTrace Document Analysis
      </p>

      <h2 className="mt-1 text-2xl font-semibold">
        Upload Policy Document
      </h2>

      <p className="mt-2 text-sm text-gray-600">
        Upload a PDF. Azure Document
        Intelligence extracts page-aware
        evidence, and Microsoft Foundry
        analyzes the document using verified
        evidence references.
      </p>

      <input
        type="file"
        accept="application/pdf"
        onChange={(event) => {
          setFile(
            event.target.files?.[0] ??
              null
          );

          setResult(null);
          setAnalysis(null);
          setError("");
        }}
        className="mt-5 block w-full rounded-lg border border-gray-300 p-3"
      />

      {file && (
        <p className="mt-2 text-sm text-gray-600">
          Selected: {file.name}
        </p>
      )}

      <button
        type="button"
        onClick={uploadAndAnalyze}
        disabled={!file || loading}
        className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Extracting & Analyzing..."
          : "Upload & Analyze"}
      </button>

      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 rounded-lg border bg-gray-50 p-4">
          <p className="font-semibold">
            {result.fileName}
          </p>

          <p className="mt-1 text-sm text-gray-600">
            Pages extracted:{" "}
            {result.pageCount}
          </p>

          <p className="mt-1 text-sm text-gray-600">
            File size:{" "}
            {(result.fileSize / 1024).toFixed(
              1
            )}{" "}
            KB
          </p>
        </div>
      )}

      {analysis && (
        <div className="mt-8 space-y-8">
          {/* SUMMARY */}
          <div className="rounded-xl border bg-blue-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              AI-generated interpretation
            </p>

            <h3 className="mt-2 text-xl font-semibold">
              Document Summary
            </h3>

            <p className="mt-2 leading-7">
              {analysis.summary}
            </p>
          </div>

          {/* STAKEHOLDERS */}
          <div>
            <h3 className="text-lg font-semibold">
              Affected Stakeholder Groups
            </h3>

            <div className="mt-3 flex flex-wrap gap-2">
              {analysis.stakeholderGroups.map(
                (stakeholder) => (
                  <span
                    key={stakeholder}
                    className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                  >
                    {stakeholder}
                  </span>
                )
              )}
            </div>
          </div>

          {/* REQUIREMENTS */}
          <div>
            <h3 className="text-lg font-semibold">
              Requirements
            </h3>

            <div className="mt-4 space-y-5">
              {analysis.requirements.map(
                (item, index) => {
                  const evidenceForItem =
                    getEvidenceForItem(
                      item
                    );

                  return (
                    <div
                      key={index}
                      className="rounded-xl border bg-white p-5"
                    >
                      <p className="font-medium">
                        {item.statement}
                      </p>

                      <div className="mt-4 space-y-3">
                        {evidenceForItem.length >
                        0 ? (
                          evidenceForItem.map(
                            (evidence) => (
                              <div
                                key={
                                  evidence.id
                                }
                                className="rounded-lg border-l-4 border-blue-500 bg-gray-50 p-4"
                              >
                                <p className="text-sm font-semibold text-blue-700">
                                  Page{" "}
                                  {
                                    evidence.pageNumber
                                  }
                                </p>

                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                                  {
                                    evidence.text
                                  }
                                </p>
                              </div>
                            )
                          )
                        ) : (
                          <p className="text-sm text-red-600">
                            No verified evidence
                            found for this
                            requirement.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* FACTS */}
          <div>
            <h3 className="text-lg font-semibold">
              Document Facts
            </h3>

            <div className="mt-4 space-y-5">
              {analysis.facts.map(
                (item, index) => {
                  const evidenceForItem =
                    getEvidenceForItem(
                      item
                    );

                  return (
                    <div
                      key={index}
                      className="rounded-xl border bg-white p-5"
                    >
                      <p className="font-medium">
                        {item.statement}
                      </p>

                      <div className="mt-4 space-y-3">
                        {evidenceForItem.length >
                        0 ? (
                          evidenceForItem.map(
                            (evidence) => (
                              <div
                                key={
                                  evidence.id
                                }
                                className="rounded-lg border-l-4 border-gray-400 bg-gray-50 p-4"
                              >
                                <p className="text-sm font-semibold text-gray-700">
                                  Page{" "}
                                  {
                                    evidence.pageNumber
                                  }
                                </p>

                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                                  {
                                    evidence.text
                                  }
                                </p>
                              </div>
                            )
                          )
                        ) : (
                          <p className="text-sm text-red-600">
                            No verified evidence
                            found for this fact.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* CONFIDENCE */}
          <div>
            <h3 className="text-lg font-semibold">
              Confidence
            </h3>

            <p className="mt-2 capitalize">
              {analysis.confidence}
            </p>
          </div>

          {/* LIMITATIONS */}
          {analysis.limitations.length >
            0 && (
            <div>
              <h3 className="text-lg font-semibold">
                Limitations
              </h3>

              <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-gray-700">
                {analysis.limitations.map(
                  (limitation, index) => (
                    <li key={index}>
                      {limitation}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

          {/* TRUST NOTICE */}
          <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-900">
            AI-generated interpretation.
            Evidence page numbers and text are
            resolved from Azure Document
            Intelligence output rather than
            generated by the language model.
            Analysts should still verify
            conclusions against the original
            document.
          </div>
        </div>
      )}
    </section>
  );
}