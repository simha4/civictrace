import { NextResponse } from "next/server";
import { z } from "zod";

import { askFoundry } from "../../../lib/ai/foundry";
import { searchEvidence } from "../../../lib/search/azure-search";

const RequestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1),

  caseId: z
    .string()
    .trim()
    .min(1),
});

const AnswerSchema = z.object({
  answer: z.string(),

  confidence: z.enum([
    "high",
    "medium",
    "low",
  ]),

  evidenceIds: z.array(
    z.string()
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
      question,
      caseId,
    } =
      RequestSchema.parse(
        body
      );

    const matches =
      await searchEvidence(
        question,
        caseId
      );

    if (
      matches.length === 0
    ) {
      return NextResponse.json({
        answer:
          "I could not find enough supporting evidence in this CivicTrace case to answer the question.",

        confidence:
          "low",

        evidenceIds:
          [],

        limitations: [
          "No relevant evidence was retrieved from Azure AI Search for this case.",
        ],

        evidence:
          [],
      });
    }

    const evidenceContext =
      matches
        .map(
          (item) => {
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
              const hearingParts: string[] =
                [];

              if (
                item.speaker
              ) {
                hearingParts.push(
                  item.speaker
                );
              }

              if (
                typeof item.sequenceNumber ===
                "number"
              ) {
                hearingParts.push(
                  `statement ${item.sequenceNumber}`
                );
              }

              humanReadableSource =
                hearingParts.length >
                0
                  ? hearingParts.join(
                      ", "
                    )
                  : "hearing testimony";
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
        )
        .join(
          "\n---\n"
        );

    const prompt = `
You are CivicTrace, an evidence-grounded policy and public sentiment analysis assistant.

Answer the user's question using ONLY the retrieved evidence below.

The evidence may come from:
- policy documents
- submitted public comments
- public hearing testimony

Return ONLY valid JSON using exactly this structure:

{
  "answer": "Concise neutral answer written for a human reader",
  "confidence": "high",
  "evidenceIds": ["exact-evidence-id"],
  "limitations": []
}

Rules:

- Use only the evidence supplied below.
- Do not use outside knowledge.
- Do not invent facts.
- Do not invent quotations.
- Do not invent page numbers.
- Do not invent comment numbers.
- Do not invent speaker names.
- Do not invent evidence IDs.
- Every evidence ID must exactly match an EVIDENCE ID supplied below.
- Cite only evidence that actually supports the answer.
- Clearly distinguish policy document evidence from submitted public comments and hearing testimony when relevant.
- Do not claim submitted comments or hearing speakers represent the broader public.
- If evidence is incomplete, conflicting, or ambiguous, state that clearly.
- Keep the answer neutral and factual.
- confidence must be exactly "high", "medium", or "low".

IMPORTANT PRESENTATION RULES:

- Do NOT include raw EVIDENCE ID values in the prose answer.
- Do NOT include UUIDs or internal database/search identifiers in the prose answer.
- Use human-readable source descriptions instead.
- Examples of human-readable source descriptions:
  - "the policy document"
  - "policy page 2"
  - "submitted public comment 2"
  - "Resident 1"
  - "Business Owner"
  - "hearing testimony"
- The exact raw evidence IDs should appear ONLY inside the "evidenceIds" JSON array.
- The prose answer should read naturally for a policy analyst or decision-maker.

Return JSON only.
Do not use markdown code fences.

QUESTION:

${question}

RETRIEVED EVIDENCE:

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
      AnswerSchema.parse(
        parsed
      );

    const validIds =
      new Set(
        matches.map(
          (item) =>
            item.id
        )
      );

    const evidenceIds =
      validated.evidenceIds.filter(
        (id) =>
          validIds.has(
            id
          )
      );

    const evidence =
      matches
        .filter(
          (item) =>
            evidenceIds.includes(
              item.id
            )
        )
        .map(
          (item) => ({
            id:
              item.id,

            caseId:
              item.caseId,

            sourceTitle:
              item.sourceTitle,

            sourceType:
              item.sourceType,

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
      answer:
        validated.answer,

      confidence:
        validated.confidence,

      evidenceIds,

      limitations:
        validated.limitations,

      evidence,
    });
  } catch (error) {
    console.error(
      "RAG policy question error:",
      error
    );

    if (
      error instanceof
      z.ZodError
    ) {
      return NextResponse.json(
        {
          error:
            "question and caseId are required",
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to answer the policy question",
      },
      {
        status: 500,
      }
    );
  }
}