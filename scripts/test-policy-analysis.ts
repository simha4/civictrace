import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: ".env.local" });

const InsightSchema = z.object({
  claim: z.string(),
  stakeholders: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
  evidence: z.array(z.string()),
});

async function main() {
  const { askFoundry } = await import("../lib/ai/foundry");

  const policyText =
    "Organizations must submit quarterly reports within 30 days of each reporting period.";

  const prompt = `
Analyze the following policy requirement.

Return ONLY valid JSON in this exact shape:
{
  "claim": "string",
  "stakeholders": ["string"],
  "confidence": "high | medium | low",
  "evidence": ["string"]
}

Policy text:
${policyText}
`;

  const raw = await askFoundry(prompt);

  console.log("Raw response:");
  console.log(raw);

  const parsed = JSON.parse(raw);
  const validated = InsightSchema.parse(parsed);

  console.log("\nValidated insight:");
  console.log(validated);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});