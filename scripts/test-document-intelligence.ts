import dotenv from "dotenv";
import DocumentIntelligence, {
  getLongRunningPoller,
  isUnexpected,
  type AnalyzeOperationOutput,
} from "@azure-rest/ai-document-intelligence";

import { AzureKeyCredential } from "@azure/core-auth";
import { readFile } from "node:fs/promises";

dotenv.config({ path: ".env.local" });

async function main() {
  // Load environment variables inside main so TypeScript can narrow them
  const endpoint = process.env.DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = process.env.DOCUMENT_INTELLIGENCE_API_KEY;

  if (!endpoint) {
    throw new Error(
      "DOCUMENT_INTELLIGENCE_ENDPOINT is missing from .env.local"
    );
  }

  if (!key) {
    throw new Error(
      "DOCUMENT_INTELLIGENCE_API_KEY is missing from .env.local"
    );
  }

  const filePath = process.argv[2];

  if (!filePath) {
    throw new Error(
      "Usage: npm run test:document -- /path/to/file.pdf"
    );
  }

  console.log("Document Intelligence endpoint loaded: true");
  console.log("Document Intelligence key loaded: true");
  console.log("Analyzing:", filePath);

  const client = DocumentIntelligence(
    endpoint,
    new AzureKeyCredential(key)
  );

  const base64Source = await readFile(filePath, {
    encoding: "base64",
  });

  const initialResponse = await client
    .path(
      "/documentModels/{modelId}:analyze",
      "prebuilt-layout"
    )
    .post({
      contentType: "application/json",
      body: {
        base64Source,
      },
      queryParameters: {
        outputContentFormat: "markdown",
      },
    });

  if (isUnexpected(initialResponse)) {
    console.error(initialResponse.body);
    throw new Error(
      "Document Intelligence request failed"
    );
  }

  const poller = getLongRunningPoller(
    client,
    initialResponse
  );

  console.log("Waiting for Document Intelligence...");

  const result = (await poller.pollUntilDone())
    .body as AnalyzeOperationOutput;

  console.log("\nStatus:", result.status);

  console.log(
    "\nPages:",
    result.analyzeResult?.pages?.length ?? 0
  );

  console.log(
    "\nExtracted content:\n"
  );

  console.log(
    result.analyzeResult?.content?.slice(0, 4000) ??
      "No content extracted"
  );
}

main().catch((error) => {
  console.error("\nDocument Intelligence test failed:");
  console.error(error);

  process.exit(1);
});