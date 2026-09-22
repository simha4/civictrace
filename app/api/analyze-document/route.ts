import { NextResponse } from "next/server";
import { z } from "zod";
import { askFoundry } from "../../../lib/ai/foundry";

const PageSchema = z.object({
  pageNumber: z.number(),
  text: z.string(),
});

const DocumentAnalysisSchema = z.object({
  summary: z.string(),

  stakeholderGroups: z.array(z.string()),

  requirements: z.array(
    z.object({
      statement: z.string(),
      evidenceIds: z.array(z.string()),
    })
  ),

  facts: z.array(
    z.object({
      statement: z.string(),
      evidenceIds: z.array(z.string()),
    })
  ),

  confidence: z.enum([
    "high",
    "medium",
    "low",
  ]),

  limitations: z.array(z.string()),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const pages =
      z.array(PageSchema).parse(body.pages);

    if (pages.length === 0) {
      return NextResponse.json(
        {
          error: "Document pages are required",
        },
        {
          status: 400,
        }
      );
    }

    const evidence = pages.map((page) => ({
      id: `page-${page.pageNumber}`,
      pageNumber: page.pageNumber,
      text: page.text,
    }));

    const documentText = evidence
      .map(
        (item) =>
          `EVIDENCE ID: ${item.id}\n` +
          `PAGE: ${item.pageNumber}\n` +
          `${item.text}`
      )
      .join("\n\n---\n\n");

    const prompt = `
You are CivicTrace, an evidence-grounded policy analysis assistant.

Analyze the document evidence below.

Return ONLY valid JSON in exactly this structure:

{
  "summary": "Concise neutral summary",
  "stakeholderGroups": [
    "Stakeholder group"
  ],
  "requirements": [
    {
      "statement": "Requirement",
      "evidenceIds": ["page-1"]
    }
  ],
  "facts": [
    {
      "statement": "Document fact",
      "evidenceIds": ["page-2"]
    }
  ],
  "confidence": "high",
  "limitations": []
}

Rules:
- Use only information supplied below.
- Do not invent evidence IDs.
- evidenceIds must exactly match the EVIDENCE ID values provided.
- Do not generate page numbers.
- Do not generate quotations.
- Classify obligations or expected actions as requirements.
- Classify descriptive information as facts.
- Stakeholders should generally be groups, not individual names.
- Keep the summary neutral.
- confidence must be "high", "medium", or "low".
- Return JSON only.
- Do not use markdown code fences.

DOCUMENT EVIDENCE:

${documentText}
`;

    const raw = await askFoundry(prompt);

    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    const validated =
      DocumentAnalysisSchema.parse(parsed);

    const validEvidenceIds =
      new Set(evidence.map((item) => item.id));

    const validateIds = (
      ids: string[]
    ) =>
      ids.filter((id) =>
        validEvidenceIds.has(id)
      );

    const requirements =
      validated.requirements.map((item) => ({
        ...item,
        evidenceIds: validateIds(
          item.evidenceIds
        ),
      }));

    const facts =
      validated.facts.map((item) => ({
        ...item,
        evidenceIds: validateIds(
          item.evidenceIds
        ),
      }));

    return NextResponse.json({
      summary: validated.summary,
      stakeholderGroups:
        validated.stakeholderGroups,
      requirements,
      facts,
      confidence: validated.confidence,
      limitations: validated.limitations,
      evidence,
    });
  } catch (error) {
    console.error(
      "Document analysis error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Document analysis failed",
      },
      {
        status: 500,
      }
    );
  }
}