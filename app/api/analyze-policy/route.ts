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
        { error: "policyText is required" },
        { status: 400 }
      );
    }

    const prompt = `
Analyze the following policy requirement.

Return ONLY valid JSON in this exact structure:

{
  "claim": "string",
  "stakeholders": ["string"],
  "confidence": "high | medium | low",
  "evidence": ["string"]
}

Do not invent facts.
Only use information supported by the provided policy text.

Policy text:
${policyText}
`;

    const raw = await askFoundry(prompt);

    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    const validated = PolicyAnalysisSchema.parse(parsed);

    return NextResponse.json(validated);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Policy analysis failed" },
      { status: 500 }
    );
  }
}