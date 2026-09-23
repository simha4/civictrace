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

  evidenceIds:
    z.array(z.string()),

  limitations:
    z.array(z.string()),
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
      RequestSchema.parse(body);

    // Search only evidence belonging to this uploaded case.
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
          "I could not find enough supporting evidence in this uploaded document to answer the question.",

        confidence: "low",

        evidenceIds: [],

        limitations: [
          "No relevant evidence was retrieved from Azure AI Search for this document.",
        ],

        evidence: [],
      });
    }

    const evidenceContext =
      matches
        .map(
          (item) => `
EVIDENCE ID: ${item.id}
SOURCE: ${item.sourceTitle}
SOURCE TYPE: ${item.sourceType}
PAGE: ${item.pageNumber}

TEXT:
${item.content}
`
        )
        .join(
          "\n---\n"
        );

    const prompt = `
You are CivicTrace, an evidence-grounded policy analysis assistant.

Answer the user's question using ONLY the retrieved evidence below.

Return ONLY valid JSON using exactly this structure:

{
  "answer": "Concise neutral answer",
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
- Do not invent evidence IDs.
- Every evidence ID must exactly match an EVIDENCE ID supplied below.
- Cite only evidence that actually supports the answer.
- If evidence is incomplete or ambiguous, state that clearly.
- Keep the answer neutral and factual.
- confidence must be exactly "high", "medium", or "low".
- Return JSON only.
- Do not use markdown code fences.

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
      JSON.parse(cleaned);

    const validated =
      AnswerSchema.parse(
        parsed
      );

    // Never trust the model to create evidence references.
    // Only IDs actually retrieved from Search are permitted.
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
          validIds.has(id)
      );

    // Resolve evidence using Azure Search results,
    // not model-generated page text.
    const evidence =
      matches
        .filter((item) =>
          evidenceIds.includes(
            item.id
          )
        )
        .map(
          (item) => ({
            id: item.id,
            caseId:
              item.caseId,
            sourceTitle:
              item.sourceTitle,
            sourceType:
              item.sourceType,
            pageNumber:
              item.pageNumber,
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