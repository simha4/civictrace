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

export default function PolicyUploader() {
  const [file, setFile] =
    useState<File | null>(null);

  const [result, setResult] =
    useState<UploadResult | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function uploadPolicy() {
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch(
        "/api/upload-policy",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Upload failed"
        );
      }

      setResult(data);
    } catch (error) {
      console.error(error);

      setError(
        "Unable to process the PDF."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
        Azure Document Intelligence
      </p>

      <h2 className="mt-1 text-2xl font-semibold">
        Upload Policy Document
      </h2>

      <p className="mt-2 text-sm text-gray-600">
        Upload a PDF and CivicTrace will extract
        the document text while preserving
        page-level evidence.
      </p>

      <input
        type="file"
        accept="application/pdf"
        onChange={(event) => {
          setFile(
            event.target.files?.[0] ?? null
          );

          setResult(null);
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
        onClick={uploadPolicy}
        disabled={!file || loading}
        className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Processing PDF..."
          : "Upload & Extract"}
      </button>

      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="font-semibold">
              {result.fileName}
            </p>

            <p className="mt-1 text-sm text-gray-600">
              Extracted pages:{" "}
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

          <div>
            <h3 className="text-lg font-semibold">
              Extracted Evidence
            </h3>

            <p className="mt-1 text-sm text-gray-600">
              Page-aware text extracted by Azure
              Document Intelligence.
            </p>

            <div className="mt-4 space-y-4">
              {result.pages.map((page) => (
                <div
                  key={page.pageNumber}
                  className="rounded-lg border bg-gray-50 p-4"
                >
                  <p className="text-sm font-semibold text-blue-700">
                    Page {page.pageNumber}
                  </p>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                    {page.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}