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

const AllowedStances = [
  "support",
  "oppose",
  "neutral",
  "mixed",
] as const;

type Stance =
  (typeof AllowedStances)[number];

/*
 * Important:
 *
 * We deliberately accept stance as a string from Foundry.
 * The model may occasionally return values such as:
 *
 * "concern"
 * "opposition"
 * "support_with_concern"
 * "mixed_support"
 *
 * We normalize those values on the server instead of
 * failing the entire analysis.
 */
const RawClassificationSchema = z.object({
  commentId: z.string(),
  stance: z.string(),
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

const RawModelResponseSchema = z.object({
  classifications: z.array(
    RawClassificationSchema
  ),

  themes: z.array(
    ThemeSchema
  ),

  limitations: z.array(
    z.unknown()
  ),
});

function normalizeStance(
  value: string
): Stance {
  const normalized =
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/-/g, "_");

  /*
   * Exact valid values.
   */
  if (
    AllowedStances.includes(
      normalized as Stance
    )
  ) {
    return normalized as Stance;
  }

  /*
   * Common support variants.
   */
  if (
    normalized === "supported" ||
    normalized === "positive" ||
    normalized === "in_support" ||
    normalized === "supportive"
  ) {
    return "support";
  }

  /*
   * Common opposition / concern variants.
   */
  if (
    normalized === "opposition" ||
    normalized === "opposed" ||
    normalized === "against" ||
    normalized === "negative"
  ) {
    return "oppose";
  }

  /*
   * Support combined with an explicit concern,
   * objection, reservation, or qualification
   * should be treated as mixed.
   */
  if (
    normalized.includes(
      "support_with"
    ) ||
    normalized.includes(
      "support_but"
    ) ||
    normalized.includes(
      "mixed_support"
    ) ||
    normalized.includes(
      "qualified_support"
    ) ||
    normalized.includes(
      "conditional_support"
    )
  ) {
    return "mixed";
  }

  /*
   * A pure concern does not automatically mean
   * opposition. We use neutral unless the model
   * explicitly indicates opposition.
   */
  if (
    normalized === "concern" ||
    normalized === "concerned" ||
    normalized === "unclear" ||
    normalized === "informational" ||
    normalized === "unknown"
  ) {
    return "neutral";
  }

  return "neutral";
}

function normalizeLimitation(
  value: unknown
): string | null {
  if (
    typeof value === "string"
  ) {
    const trimmed =
      value.trim();

    return trimmed
      ? trimmed
      : null;
  }

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    const record =
      value as Record<
        string,
        unknown
      >;

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
  /*
   * Parse the incoming user request separately.
   *
   * This prevents a malformed model response from
   * incorrectly producing the message:
   * "caseId and valid comments are required."
   */
  let requestData:
    z.infer<
      typeof RequestSchema
    >;

  try {
    const body =
      await request.json();

    requestData =
      RequestSchema.parse(
        body
      );
  } catch (error) {
    console.error(
      "Invalid public comment request:",
      error
    );

    return NextResponse.json(
      {
        error:
          "caseId and between 1 and 100 valid comments are required.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const {
      caseId,
      comments,
    } =
      requestData;

    /*
     * Create deterministic local evidence IDs.
     *
     * These IDs are what Foundry sees.
     */
    const evidence =
      comments.map(
        (
          comment,
          index
        ) => ({
          id:
            `comment-${index + 1}`,

          text:
            comment,

          sequenceNumber:
            index + 1,
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
You are TRACE, an evidence-grounded public comment analysis assistant.

Analyze ONLY the submitted public comments.

Return ONLY valid JSON using exactly this structure:

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
      "label": "Implementation timeline",
      "summary": "A submitted comment raises concern about the implementation timeline.",
      "evidenceIds": ["comment-2"]
    }
  ],

  "limitations": [
    "The submitted comments are a small sample."
  ]
}

STANCE VALUES:

The "stance" field MUST be exactly one of:

- "support"
- "oppose"
- "neutral"
- "mixed"

STANCE DEFINITIONS:

"support"
- The comment clearly supports the policy or proposal
  without expressing a substantive objection.

Example:
"I support the policy because it will improve access."

"oppose"
- The comment clearly rejects or opposes the policy
  or proposal.

Example:
"I oppose this policy because the cost is too high."

"neutral"
- The comment does not clearly support or oppose
  the proposal.
- Questions, requests for information, and standalone
  concerns without an explicit overall position should
  normally be neutral.

Example:
"I need more information about enforcement."

"mixed"
- The comment expresses support while ALSO raising
  a substantive objection, reservation, concern,
  condition, or requested change.

Example:
"I support the goal, but the six-month deadline is too short."

IMPORTANT:
If a comment says "I support..." followed by "but",
"however", or an explicit concern, classify it as "mixed",
not "support".

RULES:

- Analyze each supplied comment exactly once.
- Use only the comments supplied below.
- Do not use outside knowledge.
- Do not invent comments.
- Do not invent COMMENT IDs.
- Every commentId must exactly match a supplied COMMENT ID.
- Every theme evidenceId must exactly match a supplied COMMENT ID.
- concernTags should be short neutral topic labels.
- Themes may describe recurring concerns, benefits,
  implementation issues, requests for clarification,
  or other meaningful patterns.
- Do not infer demographics.
- Do not infer political affiliation.
- Do not infer motives.
- Do not claim these comments represent the broader public.
- Keep all summaries neutral and factual.
- "limitations" MUST be an array of plain strings.
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
      RawModelResponseSchema.parse(
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
     * Normalize and validate classifications.
     */
    const classificationMap =
      new Map<
        string,
        {
          commentId: string;
          stance: Stance;
          concernTags: string[];
        }
      >();

    for (
      const classification
      of validated.classifications
    ) {
      if (
        !validIds.has(
          classification.commentId
        )
      ) {
        continue;
      }

      if (
        classificationMap.has(
          classification.commentId
        )
      ) {
        continue;
      }

      classificationMap.set(
        classification.commentId,
        {
          commentId:
            classification.commentId,

          stance:
            normalizeStance(
              classification.stance
            ),

          concernTags:
            classification.concernTags,
        }
      );
    }

    /*
     * Ensure every comment gets exactly one result,
     * even if Foundry omitted one.
     */
    const classifications =
      evidence.map(
        (item) => {
          const existing =
            classificationMap.get(
              item.id
            );

          if (existing) {
            return existing;
          }

          return {
            commentId:
              item.id,

            stance:
              "neutral" as const,

            concernTags:
              [],
          };
        }
      );

    /*
     * Deterministic server-side totals.
     */
    const stanceCounts: Record<
      Stance,
      number
    > = {
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

    /*
     * Validate all model-created theme evidence IDs.
     */
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

              /*
               * "Less common" is deliberately
               * scoped only to this submitted sample.
               */
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

    /*
     * Resolve original submitted comment text.
     */
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
            id:
              item.id,

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

    /*
     * Raw comments become searchable evidence.
     *
     * We store the original submitted statements,
     * not Foundry-generated summaries.
     */
    const searchDocuments:
      EvidenceDocument[] =
      evidence.map(
        (item) => ({
          id:
            `${caseId}-${item.id}`,

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

    const normalizedLimitations =
      validated.limitations
        .map(
          normalizeLimitation
        )
        .filter(
          (
            limitation
          ): limitation is string =>
            limitation !==
            null
        );

    const representativenessWarning =
      "This analysis describes only the submitted comments and should not be treated as representative of the broader public unless the collection method supports that conclusion.";

    if (
      !normalizedLimitations.includes(
        representativenessWarning
      )
    ) {
      normalizedLimitations.push(
        representativenessWarning
      );
    }

    return NextResponse.json({
      sampleSize:
        comments.length,

      stanceCounts,

      classifications,

      themes,

      limitations:
        normalizedLimitations,

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
      console.error(
        "Foundry comment response validation issues:",
        error.issues
      );

      return NextResponse.json(
        {
          error:
            "The AI returned an invalid public-comment analysis response.",
        },
        {
          status: 502,
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