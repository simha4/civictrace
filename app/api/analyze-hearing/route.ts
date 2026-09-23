import { NextResponse } from "next/server";
import { z } from "zod";

import { askFoundry } from "../../../lib/ai/foundry";

const TranscriptItemSchema = z.object({
  id: z.string(),
  speaker: z.string(),
  text: z.string(),
});

const RequestSchema = z.object({
  transcript: z
    .array(TranscriptItemSchema)
    .min(1)
    .max(200),
});

const InsightSchema = z.object({
  type: z.enum([
    "concern",
    "support",
    "question",
    "implementation_issue",
    "possible_misunderstanding",
    "other",
  ]),

  claim: z.string(),

  evidenceIds: z.array(
    z.string()
  ),
});

const ModelResponseSchema = z.object({
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
    InsightSchema
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

    const { transcript } =
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

    const evidenceContext =
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
You are CivicTrace, an evidence-grounded public hearing analysis assistant.

Analyze ONLY the hearing testimony supplied below.

Return ONLY valid JSON in exactly this shape:

{
  "summary": "Neutral summary of the hearing testimony",
  "themes": [
    {
      "label": "Implementation cost",
      "summary": "Some speakers raised concerns about implementation costs.",
      "evidenceIds": ["hearing-2"]
    }
  ],
  "insights": [
    {
      "type": "concern",
      "claim": "A speaker raised concerns about implementation cost.",
      "evidenceIds": ["hearing-2"]
    }
  ],
  "limitations": []
}

Rules:

- Use only the supplied hearing testimony.
- Do not use outside knowledge.
- Do not invent speakers.
- Do not invent quotations.
- Do not invent evidence IDs.
- evidenceIds must exactly match supplied EVIDENCE ID values.
- Keep claims neutral and factual.
- Do not infer demographics, political affiliation, motives, or identity.
- Do not claim the speakers represent the broader public.
- Distinguish questions, concerns, support, and implementation issues.
- A possible misunderstanding should only be identified when the testimony itself provides enough evidence to justify that interpretation.
- If the sample is small or incomplete, mention that in limitations.
- Return JSON only.
- Do not use markdown code fences.

HEARING TESTIMONY:

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
            ...insight,

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
            "Invalid hearing transcript data.",
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