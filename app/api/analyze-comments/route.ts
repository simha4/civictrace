import { NextResponse } from "next/server";
import { z } from "zod";

import { askFoundry } from "../../../lib/ai/foundry";

const RequestSchema = z.object({
  comments: z
    .array(z.string().trim().min(1))
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

  concernTags: z.array(z.string()),
});

const ThemeSchema = z.object({
  label: z.string(),
  summary: z.string(),
  evidenceIds: z.array(z.string()),
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

    const { comments } =
      RequestSchema.parse(body);

    const evidence =
      comments.map(
        (
          comment,
          index
        ) => ({
          id: `comment-${index + 1}`,
          text: comment,
        })
      );

    const evidenceContext =
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

Analyze ONLY the public comments supplied below.

Return ONLY valid JSON in exactly this shape:

{
  "classifications": [
    {
      "commentId": "comment-1",
      "stance": "support",
      "concernTags": ["cost", "implementation"]
    }
  ],
  "themes": [
    {
      "label": "Implementation cost",
      "summary": "Several comments raise concerns about implementation costs.",
      "evidenceIds": ["comment-1", "comment-3"]
    }
  ],
  "limitations": []
}

STANCE DEFINITIONS:

- "support":
  the comment clearly expresses support for the proposal, policy, or action.

- "oppose":
  the comment clearly expresses opposition.

- "neutral":
  the comment is informational, unclear, or does not express a clear position.

- "mixed":
  the comment expresses both support and concern/opposition.

RULES:

- Use only the comments provided below.
- Do not use outside knowledge.
- Do not invent comments.
- Do not invent COMMENT IDs.
- Every commentId and evidenceId must exactly match a provided COMMENT ID.
- Classify every supplied comment exactly once.
- concernTags should be short neutral topic labels.
- Themes should represent recurring concerns, benefits, implementation issues, misunderstandings, or other meaningful patterns.
- Do not claim that these comments represent the broader public.
- Do not infer demographics or personal characteristics.
- Do not infer political affiliation.
- Keep summaries neutral and factual.
- If the sample is small or ambiguous, mention that in limitations.
- Return JSON only.
- Do not use markdown code fences.

PUBLIC COMMENTS:

${evidenceContext}
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
      ModelResponseSchema.parse(
        parsed
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
        (item) => {
          return (
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

            text:
              item.text,

            stance:
              classification?.stance ??
              "neutral",

            concernTags:
              classification?.concernTags ??
              [],
          };
        }
      );

    return NextResponse.json({
      sampleSize:
        comments.length,

      stanceCounts,

      classifications,

      themes,

      limitations: [
        ...validated.limitations,

        "This analysis describes only the submitted comments and should not be treated as representative of the broader public unless the underlying collection method supports that conclusion.",
      ],

      evidence:
        resolvedEvidence,
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
            "comments must contain between 1 and 100 non-empty comments",
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to analyze public comments",
      },
      {
        status: 500,
      }
    );
  }
}