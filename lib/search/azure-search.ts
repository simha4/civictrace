import {
  SearchClient,
  SearchIndexClient,
  type SearchIndex,
} from "@azure/search-documents";

import { DefaultAzureCredential } from "@azure/identity";

const endpoint = process.env.AZURE_SEARCH_ENDPOINT;

const indexName =
  process.env.AZURE_SEARCH_INDEX ?? "civictrace-evidence";

if (!endpoint) {
  throw new Error(
    "AZURE_SEARCH_ENDPOINT is missing from environment variables"
  );
}

const credential = new DefaultAzureCredential();

export type EvidenceDocument = {
  id: string;

  caseId: string;

  sourceType:
    | "policy"
    | "public_comment"
    | "hearing";

  sourceTitle: string;

  pageNumber?: number;

  sequenceNumber?: number;

  speaker?: string;

  content: string;
};

export const searchIndexClient =
  new SearchIndexClient(
    endpoint,
    credential
  );

export const searchClient =
  new SearchClient<EvidenceDocument>(
    endpoint,
    indexName,
    credential
  );

export async function ensureSearchIndex() {
  const index: SearchIndex = {
    name: indexName,

    fields: [
      {
        name: "id",
        type: "Edm.String",
        key: true,
        filterable: true,
      },

      {
        name: "caseId",
        type: "Edm.String",
        filterable: true,
      },

      {
        name: "sourceType",
        type: "Edm.String",
        searchable: true,
        filterable: true,
        facetable: true,
      },

      {
        name: "sourceTitle",
        type: "Edm.String",
        searchable: true,
        filterable: true,
      },

      {
        name: "pageNumber",
        type: "Edm.Int32",
        filterable: true,
        sortable: true,
      },

      {
        name: "sequenceNumber",
        type: "Edm.Int32",
        filterable: true,
        sortable: true,
      },

      {
        name: "speaker",
        type: "Edm.String",
        searchable: true,
        filterable: true,
      },

      {
        name: "content",
        type: "Edm.String",
        searchable: true,
      },
    ],
  };

  await searchIndexClient.createOrUpdateIndex(
    index
  );
}

export async function uploadEvidence(
  documents: EvidenceDocument[]
) {
  if (documents.length === 0) {
    return;
  }

  const result =
    await searchClient.uploadDocuments(
      documents
    );

  const failed =
    result.results.filter(
      (item) => !item.succeeded
    );

  if (failed.length > 0) {
    console.error(
      "Azure Search upload failures:",
      failed
    );

    throw new Error(
      "One or more evidence documents failed to upload"
    );
  }

  return result;
}

function escapeODataString(
  value: string
) {
  return value.replace(
    /'/g,
    "''"
  );
}

export async function searchEvidence(
  query: string,
  caseId?: string
) {
  const filter = caseId
    ? `caseId eq '${escapeODataString(
        caseId
      )}'`
    : undefined;

  const results =
    await searchClient.search(
      query,
      {
        top: 8,

        filter,

        select: [
          "id",
          "caseId",
          "sourceType",
          "sourceTitle",
          "pageNumber",
          "sequenceNumber",
          "speaker",
          "content",
        ],
      }
    );

  const matches: EvidenceDocument[] =
    [];

  for await (
    const result of results.results
  ) {
    matches.push(
      result.document
    );
  }

  return matches;
}

export async function getCaseEvidence(
  caseId: string
) {
  const filter =
    `caseId eq '${escapeODataString(
      caseId
    )}'`;

  const results =
    await searchClient.search(
      "*",
      {
        top: 100,

        filter,

        select: [
          "id",
          "caseId",
          "sourceType",
          "sourceTitle",
          "pageNumber",
          "sequenceNumber",
          "speaker",
          "content",
        ],
      }
    );

  const evidence: EvidenceDocument[] =
    [];

  for await (
    const result of results.results
  ) {
    evidence.push(
      result.document
    );
  }

  return evidence;
}