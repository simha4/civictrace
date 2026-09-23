"use client";

import { useState } from "react";

import PolicyUploader from "./PolicyUploader";
import PolicyQA from "./PolicyQA";

export default function PolicyWorkspace() {
  const [caseId, setCaseId] = useState<string | null>(null);
  const [sourceTitle, setSourceTitle] = useState<string | null>(null);

  function handleIndexed(
    newCaseId: string,
    fileName: string
  ) {
    setCaseId(newCaseId);
    setSourceTitle(fileName);
  }

  return (
    <>
      <PolicyUploader onIndexed={handleIndexed} />

      <div className="mt-8">
        <PolicyQA
          key={caseId ?? "no-document"}
          caseId={caseId}
          sourceTitle={sourceTitle}
        />
      </div>
    </>
  );
}