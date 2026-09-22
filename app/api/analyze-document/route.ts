import { NextResponse } from "next/server";
import { z } from "zod";
import { askFoundry } from "../../../lib/ai/foundry";

const PageSchema = z.object({
  pageNumber: z.number(),
  text: z.string(),
});

const DocumentAnalysisSchema = z.object({
  summary: z.string(),

  stakeholders: z.array(z.string()),

  keyRequirements: z.array(z.string()),

  confidence: z.enum([
    "high",
    "medium",
    "low",
  ]),

  evidence: z.array(
    z.object({
      pageNumber: z.number(),
      quote: z.string(),
    })
  ),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const pages = z.array(PageSchema).parse(body.pages);

    if (pages.length === 0) {
      return NextResponse.json(
        { error: "Document pages are required" },
        { status: 400 }
      );
    }

    const documentText = pages
      .map(
        (page) =>
          `--- PAGE ${page.pageNumber} ---\n${page.text}`
      )
      .join("\n\n");

    const prompt = `
You are CivicTrace, an evidence-grounded policy analysis assistant.

Analyze the following document.

Return ONLY valid JSON using exactly this structure:

{
  "summary": "Concise neutral summary",
  "stakeholders": ["Stakeholder 1"],
  "keyRequirements": ["Requirement 1"],
  "confidence": "high",
  "evidence": [
    {
      "pageNumber": 1,
      "quote": "Exact supporting text"
    }
  ]
}

Rules:
- Use only information contained in the supplied document.
- Do not invent facts.
- Keep the summary neutral.
- Identify stakeholders only when supported by the document.
- Every important conclusion should be grounded in evidence.
- Evidence quotes must be copied from the supplied document.
- pageNumber must match the page where the quote appears.
- confidence must be "high", "medium", or "low".
- Return JSON only.
- Do not use markdown code fences.

DOCUMENT:

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

    return NextResponse.json(validated);
  } catch (error) {
    console.error(
      "Document analysis error:",
      error
    );

    return NextResponse.json(
      {
        error: "Document analysis failed",
      },
      {
        status: 500,
      }
    );
  }
}