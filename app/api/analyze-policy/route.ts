import { NextResponse } from "next/server";
import { z } from "zod";
import { askFoundry } from "../../../lib/ai/foundry";

const PolicyAnalysisSchema = z.object({
  claim: z.string(),
  stakeholders: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
  evidence: z.array(z.string()),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const policyText = body.policyText;

    if (!policyText || typeof policyText !== "string") {
      return NextResponse.json(
        {
          error: "policyText is required",
        },
        {
          status: 400,
        }
      );
    }

    const prompt = `
You are CivicTrace, an evidence-grounded policy analysis assistant.

Analyze the policy text below.

Return ONLY valid JSON.

Use exactly this structure:

{
  "claim": "A concise explanation of what the policy requires or changes",
  "stakeholders": ["Stakeholder 1", "Stakeholder 2"],
  "confidence": "high",
  "evidence": ["Exact supporting policy language"]
}

Rules:
- Do not invent information.
- Only make claims supported by the supplied policy text.
- Identify only stakeholders reasonably affected by the text.
- confidence must be exactly "high", "medium", or "low".
- Evidence should contain text taken directly from the supplied policy.
- Do not include markdown.
- Do not wrap the JSON in code fences.

POLICY TEXT:

${policyText}
`;

    const raw = await askFoundry(prompt);

    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    const validated =
      PolicyAnalysisSchema.parse(parsed);

    return NextResponse.json(validated);
  } catch (error) {
    console.error(
      "Policy analysis error:",
      error
    );

    return NextResponse.json(
      {
        error: "Policy analysis failed",
      },
      {
        status: 500,
      }
    );
  }
}