"use client";

import { useState } from "react";

import HearingAnalyzer from "./HearingAnalyzer";
import LeadershipBrief from "./LeadershipBrief";
import PolicyUploader from "./PolicyUploader";
import PolicyQA from "./PolicyQA";
import PublicCommentsAnalyzer from "./PublicCommentsAnalyzer";

export default function PolicyWorkspace() {
  const [
    caseId,
    setCaseId,
  ] =
    useState<string | null>(
      null
    );

  const [
    sourceTitle,
    setSourceTitle,
  ] =
    useState<string | null>(
      null
    );

  function handleIndexed(
    newCaseId: string,
    fileName: string
  ) {
    setCaseId(
      newCaseId
    );

    setSourceTitle(
      fileName
    );
  }

  return (
    <>
      <PolicyUploader
        onIndexed={
          handleIndexed
        }
      />

      <div className="mt-8">
        <PublicCommentsAnalyzer
          caseId={
            caseId
          }
        />
      </div>

      <div className="mt-8">
        <HearingAnalyzer
          caseId={
            caseId
          }
        />
      </div>

      <div className="mt-8">
        <PolicyQA
          key={
            caseId ??
            "no-document"
          }
          caseId={
            caseId
          }
          sourceTitle={
            sourceTitle
          }
        />
      </div>

      <div className="mt-8">
        <LeadershipBrief
          key={`brief-${caseId ?? "no-document"}`}
          caseId={
            caseId
          }
          sourceTitle={
            sourceTitle
          }
        />
      </div>
    </>
  );
}