import { NextResponse } from "next/server";
import { z } from "zod";

import { askFoundry } from "../../../lib/ai/foundry";

import {
  ensureSearchIndex,
  uploadEvidence,
  type EvidenceDocument,
} from "../../../lib/search/azure-search";

const RequestSchema = z.object({
  caseId: z
    .string()
    .trim()
    .min(1),

  comments: z
    .array(
      z.string().trim().min(1)
    )
    .min(1)
    .max(100),
});

const ClassificationSchema = z.object({
  commentId: z.string(),

  stance: z.enum([
    "support",
    "oppose",
    "neutral",
    "mixed",
  ]),

  concernTags: z.array(
    z.string()
  ),
});

const ThemeSchema = z.object({
  label: z.string(),
  summary: z.string(),
  evidenceIds: z.array(
    z.string()
  ),
});

const ModelResponseSchema = z.object({
  classifications: z.array(
    ClassificationSchema
  ),

  themes: z.array(
    ThemeSchema
  ),

  limitations: z.array(
    z.string()
  ),
});

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const {
      caseId,
      comments,
    } =
      RequestSchema.parse(
        body
      );

    const evidence =
      comments.map(
        (comment, index) => ({
          id: `comment-${index + 1}`,
          text: comment,
          sequenceNumber:
            index + 1,
        })
      );

    const context =
      evidence
        .map(
          (item) => `
COMMENT ID: ${item.id}

TEXT:
${item.text}
`
        )
        .join(
          "\n---\n"
        );

    const prompt = `
You are CivicTrace, an evidence-grounded public comment analysis assistant.

Analyze ONLY the submitted comments.

Return ONLY valid JSON:

{
  "classifications": [
    {
      "commentId": "comment-1",
      "stance": "support",
      "concernTags": ["access"]
    }
  ],
  "themes": [
    {
      "label": "Access",
      "summary": "A submitted comment discusses access.",
      "evidenceIds": ["comment-1"]
    }
  ],
  "limitations": []
}

Rules:

- Use only the supplied comments.
- Do not use outside knowledge.
- Do not invent COMMENT IDs.
- Classify every comment exactly once.
- Keep topic labels neutral.
- Do not infer demographics or political affiliation.
- Do not claim the sample represents the broader public.
- Return JSON only.
- Do not use markdown code fences.

COMMENTS:

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

    const validated =
      ModelResponseSchema.parse(
        JSON.parse(
          cleaned
        )
      );

    const validIds =
      new Set(
        evidence.map(
          (item) =>
            item.id
        )
      );

    const classificationMap =
      new Map<
        string,
        z.infer<
          typeof ClassificationSchema
        >
      >();

    for (
      const classification
      of validated.classifications
    ) {
      if (
        validIds.has(
          classification.commentId
        ) &&
        !classificationMap.has(
          classification.commentId
        )
      ) {
        classificationMap.set(
          classification.commentId,
          classification
        );
      }
    }

    const classifications =
      evidence.map(
        (item) =>
          classificationMap.get(
            item.id
          ) ?? {
            commentId:
              item.id,

            stance:
              "neutral" as const,

            concernTags:
              [],
          }
      );

    const stanceCounts = {
      support: 0,
      oppose: 0,
      neutral: 0,
      mixed: 0,
    };

    for (
      const classification
      of classifications
    ) {
      stanceCounts[
        classification.stance
      ] += 1;
    }

    const themes =
      validated.themes
        .map(
          (theme) => {
            const evidenceIds =
              theme.evidenceIds.filter(
                (id) =>
                  validIds.has(
                    id
                  )
              );

            return {
              label:
                theme.label,

              summary:
                theme.summary,

              evidenceIds,

              evidenceCount:
                evidenceIds.length,

              lessCommon:
                evidenceIds.length >
                  0 &&
                evidenceIds.length <=
                  Math.max(
                    1,
                    Math.floor(
                      comments.length *
                        0.25
                    )
                  ),
            };
          }
        )
        .filter(
          (theme) =>
            theme.evidenceIds
              .length > 0
        );

    const resolvedEvidence =
      evidence.map(
        (item) => {
          const classification =
            classifications.find(
              (entry) =>
                entry.commentId ===
                item.id
            );

          return {
            id: item.id,
            text: item.text,

            stance:
              classification?.stance ??
              "neutral",

            concernTags:
              classification?.concernTags ??
              [],
          };
        }
      );

    /*
     * Index the raw submitted comments.
     * Foundry analysis is NOT stored as source evidence.
     */
    const searchDocuments: EvidenceDocument[] =
      evidence.map(
        (item) => ({
          id: `${caseId}-${item.id}`,

          caseId,

          sourceType:
            "public_comment",

          sourceTitle:
            "Submitted Public Comments",

          sequenceNumber:
            item.sequenceNumber,

          content:
            item.text,
        })
      );

    await ensureSearchIndex();

    await uploadEvidence(
      searchDocuments
    );

    return NextResponse.json({
      sampleSize:
        comments.length,

      stanceCounts,

      themes,

      limitations: [
        ...validated.limitations,

        "This analysis describes only the submitted comments and should not be treated as representative of the broader public unless the collection method supports that conclusion.",
      ],

      evidence:
        resolvedEvidence,

      indexedEvidenceCount:
        searchDocuments.length,
    });
  } catch (error) {
    console.error(
      "Public comment analysis error:",
      error
    );

    if (
      error instanceof
      z.ZodError
    ) {
      return NextResponse.json(
        {
          error:
            "caseId and valid comments are required.",
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to analyze public comments.",
      },
      {
        status: 500,
      }
    );
  }
}