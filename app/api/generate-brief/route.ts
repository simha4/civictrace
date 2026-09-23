import { NextResponse } from "next/server";
import { z } from "zod";

import { askFoundry } from "../../../lib/ai/foundry";

import {
  getCaseEvidence,
  type EvidenceDocument,
} from "../../../lib/search/azure-search";

const RequestSchema = z.object({
  caseId: z
    .string()
    .trim()
    .min(1),
});

const BriefItemSchema = z.object({
  statement: z.string(),

  evidenceIds: z.array(
    z.string()
  ),
});

/*
 * We intentionally accept flexible limitation values here.
 *
 * Models occasionally return:
 *
 * "limitations": [
 *   "Small submitted sample"
 * ]
 *
 * but may also return:
 *
 * "limitations": [
 *   {
 *     "issue": "Small sample",
 *     "detail": "The comments may not represent the broader public."
 *   }
 * ]
 *
 * We normalize both forms after validation.
 */
const RawBriefSchema = z.object({
  executiveSummary:
    z.string(),

  policySnapshot:
    z.array(
      BriefItemSchema
    ),

  publicFeedback:
    z.array(
      BriefItemSchema
    ),

  hearingThemes:
    z.array(
      BriefItemSchema
    ),

  implementationIssues:
    z.array(
      BriefItemSchema
    ),

  lessCommonViews:
    z.array(
      BriefItemSchema
    ),

  limitations:
    z.array(
      z.unknown()
    ),
});

function formatEvidence(
  item: EvidenceDocument
) {
  let humanReadableSource =
    item.sourceTitle;

  if (
    item.sourceType ===
      "policy" &&
    typeof item.pageNumber ===
      "number"
  ) {
    humanReadableSource =
      `${item.sourceTitle}, page ${item.pageNumber}`;
  }

  if (
    item.sourceType ===
      "public_comment" &&
    typeof item.sequenceNumber ===
      "number"
  ) {
    humanReadableSource =
      `submitted public comment ${item.sequenceNumber}`;
  }

  if (
    item.sourceType ===
    "hearing"
  ) {
    const parts: string[] =
      [];

    if (item.speaker) {
      parts.push(
        item.speaker
      );
    }

    if (
      typeof item.sequenceNumber ===
      "number"
    ) {
      parts.push(
        `statement ${item.sequenceNumber}`
      );
    }

    humanReadableSource =
      parts.length > 0
        ? parts.join(", ")
        : "public hearing testimony";
  }

  return `
EVIDENCE ID: ${item.id}
SOURCE TYPE: ${item.sourceType}
SOURCE TITLE: ${item.sourceTitle}
HUMAN-READABLE SOURCE: ${humanReadableSource}
PAGE: ${item.pageNumber ?? "N/A"}
SEQUENCE: ${item.sequenceNumber ?? "N/A"}
SPEAKER: ${item.speaker ?? "N/A"}

TEXT:
${item.content}
`;
}

function normalizeLimitation(
  value: unknown
): string | null {
  if (
    typeof value ===
    "string"
  ) {
    const trimmed =
      value.trim();

    return trimmed.length >
      0
      ? trimmed
      : null;
  }

  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(value)
  ) {
    const record =
      value as Record<
        string,
        unknown
      >;

    /*
     * Handle common object shapes first.
     */
    const title =
      typeof record.title ===
      "string"
        ? record.title.trim()
        : "";

    const issue =
      typeof record.issue ===
      "string"
        ? record.issue.trim()
        : "";

    const description =
      typeof record.description ===
      "string"
        ? record.description.trim()
        : "";

    const detail =
      typeof record.detail ===
      "string"
        ? record.detail.trim()
        : "";

    const limitation =
      typeof record.limitation ===
      "string"
        ? record.limitation.trim()
        : "";

    const message =
      typeof record.message ===
      "string"
        ? record.message.trim()
        : "";

    const heading =
      title ||
      issue ||
      limitation;

    const body =
      description ||
      detail ||
      message;

    if (
      heading &&
      body
    ) {
      return `${heading}: ${body}`;
    }

    if (heading) {
      return heading;
    }

    if (body) {
      return body;
    }

    /*
     * Generic fallback:
     * collect any string-valued properties.
     */
    const stringValues =
      Object.values(
        record
      )
        .filter(
          (
            item
          ): item is string =>
            typeof item ===
            "string"
        )
        .map(
          (item) =>
            item.trim()
        )
        .filter(Boolean);

    if (
      stringValues.length >
      0
    ) {
      return stringValues.join(
        ": "
      );
    }
  }

  return null;
}

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const { caseId } =
      RequestSchema.parse(
        body
      );

    /*
     * Retrieve every evidence item associated with
     * this CivicTrace case.
     */
    const evidence =
      await getCaseEvidence(
        caseId
      );

    if (
      evidence.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "No evidence exists for this CivicTrace case.",
        },
        {
          status: 404,
        }
      );
    }

    const context =
      evidence
        .map(
          formatEvidence
        )
        .join(
          "\n---\n"
        );

    const prompt = `
You are CivicTrace, an evidence-grounded policy and public sentiment analysis assistant.

Create a concise leadership brief using ONLY the evidence supplied below.

The evidence may contain:
- policy document pages
- submitted public comments
- public hearing testimony

Return ONLY valid JSON using exactly this structure:

{
  "executiveSummary": "Neutral high-level summary of the case.",

  "policySnapshot": [
    {
      "statement": "Evidence-grounded policy fact.",
      "evidenceIds": ["exact-id"]
    }
  ],

  "publicFeedback": [
    {
      "statement": "Neutral description of submitted public feedback.",
      "evidenceIds": ["exact-id"]
    }
  ],

  "hearingThemes": [
    {
      "statement": "Neutral description of a hearing theme.",
      "evidenceIds": ["exact-id"]
    }
  ],

  "implementationIssues": [
    {
      "statement": "Evidence-grounded implementation issue or constraint.",
      "evidenceIds": ["exact-id"]
    }
  ],

  "lessCommonViews": [
    {
      "statement": "A less frequently represented view within this submitted evidence.",
      "evidenceIds": ["exact-id"]
    }
  ],

  "limitations": [
    "Plain-text limitation"
  ]
}

STRICT OUTPUT RULES:

- "limitations" MUST be an array of plain strings.
- Do NOT return objects inside "limitations".
- Do NOT return nested structures inside "limitations".
- Example:
  "limitations": [
    "The submitted comments are a small sample.",
    "The hearing testimony should not be treated as representative of the broader public."
  ]

EVIDENCE RULES:

- Use ONLY supplied evidence.
- Do not use outside knowledge.
- Do not invent evidence IDs.
- Do not invent quotations.
- Do not invent page numbers.
- Do not invent comment numbers.
- Do not invent speakers.
- Every evidenceIds value must exactly match an EVIDENCE ID supplied below.
- Keep wording neutral and factual.
- Distinguish policy-document evidence from public comments and hearing testimony.
- Do not imply submitted comments or hearing participants represent the broader public.
- "lessCommonViews" means views occurring less frequently within THIS submitted evidence only.
- If a section is unsupported, return an empty array.
- If evidence conflicts, describe the conflict neutrally.
- Include sampling and representativeness limitations where relevant.

PRESENTATION RULES:

- Do not include raw EVIDENCE IDs or UUIDs in executiveSummary or statement text.
- Raw IDs belong only inside evidenceIds.
- Use human-readable descriptions such as:
  - "policy page 2"
  - "submitted public comment 2"
  - "Resident 1"
  - "Business Owner"
  - "hearing testimony"
- Do not recommend a political or policy decision.
- Do not say what decision-makers should choose.

Return JSON only.
Do not use markdown code fences.

CASE EVIDENCE:

${context}
`;

    const raw =
      await askFoundry(
        prompt
      );

    const cleaned =
      raw
        .replace(
          /^```json\s*/i,
          ""
        )
        .replace(
          /^```\s*/i,
          ""
        )
        .replace(
          /```$/i,
          ""
        )
        .trim();

    const parsed =
      JSON.parse(
        cleaned
      );

    /*
     * Validate the overall structure while allowing
     * us to normalize malformed limitation items.
     */
    const validated =
      RawBriefSchema.parse(
        parsed
      );

    const validIds =
      new Set(
        evidence.map(
          (item) =>
            item.id
        )
      );

    /*
     * Never trust model-generated evidence references.
     *
     * Only evidence IDs that actually came from
     * Azure AI Search survive this step.
     */
    function resolveItems(
      items: z.infer<
        typeof BriefItemSchema
      >[]
    ) {
      return items
        .map(
          (item) => {
            const evidenceIds =
              item.evidenceIds.filter(
                (id) =>
                  validIds.has(
                    id
                  )
              );

            return {
              statement:
                item.statement,

              evidenceIds,
            };
          }
        )
        .filter(
          (item) =>
            item.evidenceIds
              .length > 0
        );
    }

    const normalizedLimitations =
      validated.limitations
        .map(
          normalizeLimitation
        )
        .filter(
          (
            item
          ): item is string =>
            item !==
            null
        );

    const representativenessWarning =
      "Public comments and hearing testimony describe the submitted evidence and should not automatically be treated as representative of the broader public.";

    if (
      !normalizedLimitations.includes(
        representativenessWarning
      )
    ) {
      normalizedLimitations.push(
        representativenessWarning
      );
    }

    const resolvedEvidence =
      evidence.map(
        (item) => ({
          id:
            item.id,

          sourceType:
            item.sourceType,

          sourceTitle:
            item.sourceTitle,

          pageNumber:
            item.pageNumber,

          sequenceNumber:
            item.sequenceNumber,

          speaker:
            item.speaker,

          content:
            item.content,
        })
      );

    return NextResponse.json({
      executiveSummary:
        validated.executiveSummary,

      policySnapshot:
        resolveItems(
          validated.policySnapshot
        ),

      publicFeedback:
        resolveItems(
          validated.publicFeedback
        ),

      hearingThemes:
        resolveItems(
          validated.hearingThemes
        ),

      implementationIssues:
        resolveItems(
          validated.implementationIssues
        ),

      lessCommonViews:
        resolveItems(
          validated.lessCommonViews
        ),

      limitations:
        normalizedLimitations,

      evidence:
        resolvedEvidence,

      evidenceCount:
        resolvedEvidence.length,
    });
  } catch (error) {
    console.error(
      "Leadership brief error:",
      error
    );

    if (
      error instanceof
      z.ZodError
    ) {
      console.error(
        "Leadership brief validation issues:",
        error.issues
      );

      return NextResponse.json(
        {
          error:
            "Invalid case or leadership brief response.",
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to generate leadership brief.",
      },
      {
        status: 500,
      }
    );
  }
}