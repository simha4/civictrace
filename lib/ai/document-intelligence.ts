import DocumentIntelligence, {
  getLongRunningPoller,
  isUnexpected,
  type AnalyzeOperationOutput,
} from "@azure-rest/ai-document-intelligence";

import {
  AzureKeyCredential,
} from "@azure/core-auth";

export async function extractDocument(
  file: Buffer
) {
  const endpoint =
    process.env
      .DOCUMENT_INTELLIGENCE_ENDPOINT;

  const key =
    process.env
      .DOCUMENT_INTELLIGENCE_API_KEY;

  if (!endpoint) {
    throw new Error(
      "DOCUMENT_INTELLIGENCE_ENDPOINT is missing"
    );
  }

  if (!key) {
    throw new Error(
      "DOCUMENT_INTELLIGENCE_API_KEY is missing"
    );
  }

  const client =
    DocumentIntelligence(
      endpoint,
      new AzureKeyCredential(key)
    );

  const base64Source =
    file.toString("base64");

  const initialResponse =
    await client
      .path(
        "/documentModels/{modelId}:analyze",
        "prebuilt-layout"
      )
      .post({
        contentType:
          "application/json",

        body: {
          base64Source,
        },

        queryParameters: {
          outputContentFormat:
            "markdown",
        },
      });

  if (
    isUnexpected(
      initialResponse
    )
  ) {
    console.error(
      "Document Intelligence error:",
      initialResponse.body
    );

    throw new Error(
      "Document Intelligence request failed"
    );
  }

  const poller =
    getLongRunningPoller(
      client,
      initialResponse
    );

  const operation =
    await poller.pollUntilDone();

  const result =
    operation.body as AnalyzeOperationOutput;

  if (
    result.status !==
    "succeeded"
  ) {
    throw new Error(
      `Document analysis status: ${result.status}`
    );
  }

  const pages =
    result.analyzeResult?.pages?.map(
      (page) => ({
        pageNumber:
          page.pageNumber,

        text:
          page.lines
            ?.map(
              (line) =>
                line.content
            )
            .join("\n") ?? "",
      })
    ) ?? [];

  return {
    content:
      result.analyzeResult
        ?.content ?? "",

    pages,
  };
}