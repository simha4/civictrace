import { NextResponse } from "next/server";
import { z } from "zod";

import { askFoundry } from "../../../lib/ai/foundry";

import {
  ensureSearchIndex,
  uploadEvidence,
  type EvidenceDocument,
} from "../../../lib/search/azure-search";

const TranscriptItemSchema = z.object({
  id: z.string(),
  speaker: z.string(),
  text: z.string(),
});

const RequestSchema = z.object({
  caseId: z
    .string()
    .trim()
    .min(1),

  transcript: z
    .array(TranscriptItemSchema)
    .min(1)
    .max(200),
});

const AllowedInsightTypes = [
  "concern",
  "support",
  "question",
  "implementation_issue",
  "possible_misunderstanding",
  "other",
] as const;

type InsightType =
  (typeof AllowedInsightTypes)[number];

const RawModelResponseSchema = z.object({
  summary: z.string(),

  themes: z.array(
    z.object({
      label: z.string(),
      summary: z.string(),
      evidenceIds: z.array(
        z.string()
      ),
    })
  ),

  insights: z.array(
    z.object({
      type: z.string(),
      claim: z.string(),
      evidenceIds: z.array(
        z.string()
      ),
    })
  ),

  limitations: z.array(
    z.string()
  ),
});

function normalizeInsightType(
  value: string
): InsightType {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  if (
    AllowedInsightTypes.includes(
      normalized as InsightType
    )
  ) {
    return normalized as InsightType;
  }

  return "other";
}

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const {
      caseId,
      transcript,
    } =
      RequestSchema.parse(
        body
      );

    const validIds =
      new Set(
        transcript.map(
          (item) =>
            item.id
        )
      );

    const context =
      transcript
        .map(
          (item) => `
EVIDENCE ID: ${item.id}
SPEAKER: ${item.speaker}

TEXT:
${item.text}
`
        )
        .join(
          "\n---\n"
        );

    const prompt = `
You are TRACE, an evidence-grounded public hearing analysis assistant.

Analyze ONLY the supplied testimony.

Return ONLY valid JSON:

{
  "summary": "Neutral summary",
  "themes": [
    {
      "label": "Implementation cost",
      "summary": "A speaker raised implementation cost concerns.",
      "evidenceIds": ["hearing-2"]
    }
  ],
  "insights": [
    {
      "type": "concern",
      "claim": "A speaker raised implementation cost concerns.",
      "evidenceIds": ["hearing-2"]
    }
  ],
  "limitations": []
}

Allowed insight type values are EXACTLY:

- concern
- support
- question
- implementation_issue
- possible_misunderstanding
- other

Rules:

- Use only supplied testimony.
- Do not use outside knowledge.
- Do not invent speakers.
- Do not invent evidence IDs.
- Keep claims neutral.
- Do not infer demographics, affiliation, motives, or identity.
- Do not claim speakers represent the broader public.
- insight.type MUST be one of the allowed values listed above.
- If no allowed type fits, use "other".
- Return JSON only.
- Do not use markdown fences.

TESTIMONY:

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

    const validated =
      RawModelResponseSchema.parse(
        parsed
      );

    const themes =
      validated.themes
        .map(
          (theme) => ({
            ...theme,

            evidenceIds:
              theme.evidenceIds.filter(
                (id) =>
                  validIds.has(
                    id
                  )
              ),
          })
        )
        .filter(
          (theme) =>
            theme.evidenceIds
              .length > 0
        );

    const insights =
      validated.insights
        .map(
          (insight) => ({
            type:
              normalizeInsightType(
                insight.type
              ),

            claim:
              insight.claim,

            evidenceIds:
              insight.evidenceIds.filter(
                (id) =>
                  validIds.has(
                    id
                  )
              ),
          })
        )
        .filter(
          (insight) =>
            insight.evidenceIds
              .length > 0
        );

    const searchDocuments: EvidenceDocument[] =
      transcript.map(
        (
          item,
          index
        ) => ({
          id: `${caseId}-${item.id}`,

          caseId,

          sourceType:
            "hearing",

          sourceTitle:
            "Public Hearing Transcript",

          sequenceNumber:
            index + 1,

          speaker:
            item.speaker,

          content:
            item.text,
        })
      );

    await ensureSearchIndex();

    await uploadEvidence(
      searchDocuments
    );

    return NextResponse.json({
      summary:
        validated.summary,

      themes,

      insights,

      limitations: [
        ...validated.limitations,

        "This analysis describes only the submitted hearing testimony and should not be treated as representative of the broader public.",
      ],

      evidence:
        transcript,

      indexedEvidenceCount:
        searchDocuments.length,
    });
  } catch (error) {
    console.error(
      "Hearing analysis error:",
      error
    );

    if (
      error instanceof
      z.ZodError
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid hearing analysis response or transcript data.",
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to analyze hearing testimony.",
      },
      {
        status: 500,
      }
    );
  }
}