import { NextResponse } from "next/server";
import { z } from "zod";

import { askFoundry } from "../../../lib/ai/foundry";
import { searchEvidence } from "../../../lib/search/azure-search";

const AnswerSchema = z.object({
  answer: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  evidenceIds: z.array(z.string()),
  limitations: z.array(z.string()),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const question =
      typeof body.question === "string"
        ? body.question.trim()
        : "";

    if (!question) {
      return NextResponse.json(
        { error: "question is required" },
        { status: 400 }
      );
    }

    // 1. Retrieve relevant evidence from Azure AI Search
    const matches = await searchEvidence(question);

    if (matches.length === 0) {
      return NextResponse.json({
        answer:
          "I could not find enough supporting evidence in the indexed sources to answer this question.",
        confidence: "low",
        evidenceIds: [],
        limitations: [
          "No relevant evidence was retrieved from Azure AI Search.",
        ],
        evidence: [],
      });
    }

    // 2. Build grounded context
    const evidenceContext = matches
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
      .join("\n---\n");

    // 3. Ask Foundry to answer only from retrieved evidence
    const prompt = `
You are CivicTrace, an evidence-grounded policy analysis assistant.

Answer the user's question using ONLY the evidence provided below.

Return ONLY valid JSON in exactly this structure:

{
  "answer": "Concise neutral answer",
  "confidence": "high",
  "evidenceIds": ["page-2"],
  "limitations": []
}

Rules:
- Do not use outside knowledge.
- Do not invent facts.
- Do not invent evidence IDs.
- evidenceIds must exactly match one or more EVIDENCE ID values below.
- If the evidence is insufficient, say so clearly.
- Keep the answer neutral and factual.
- confidence must be "high", "medium", or "low".
- Return JSON only.
- Do not use markdown code fences.

QUESTION:
${question}

EVIDENCE:
${evidenceContext}
`;

    const raw = await askFoundry(prompt);

    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    const validated = AnswerSchema.parse(parsed);

    const validIds = new Set(
      matches.map((item) => item.id)
    );

    const evidenceIds =
      validated.evidenceIds.filter((id) =>
        validIds.has(id)
      );

    // 4. Resolve evidence deterministically
    const evidence = matches
      .filter((item) =>
        evidenceIds.includes(item.id)
      )
      .map((item) => ({
        id: item.id,
        sourceTitle: item.sourceTitle,
        sourceType: item.sourceType,
        pageNumber: item.pageNumber,
        content: item.content,
      }));

    return NextResponse.json({
      answer: validated.answer,
      confidence: validated.confidence,
      evidenceIds,
      limitations: validated.limitations,
      evidence,
    });
  } catch (error) {
    console.error("RAG policy question error:", error);

    return NextResponse.json(
      {
        error: "Unable to answer the policy question",
      },
      {
        status: 500,
      }
    );
  }
}