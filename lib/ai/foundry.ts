import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";

const endpoint = process.env.FOUNDRY_PROJECT_ENDPOINT;
const model = process.env.FOUNDRY_MODEL_NAME;

if (!endpoint) {
  throw new Error(
    "FOUNDRY_PROJECT_ENDPOINT is missing from .env.local"
  );
}

if (!model) {
  throw new Error(
    "FOUNDRY_MODEL_NAME is missing from .env.local"
  );
}

const project = new AIProjectClient(
  endpoint,
  new DefaultAzureCredential()
);

export async function askFoundry(prompt: string) {
  const client = project.getOpenAIClient();

  const response = await client.responses.create({
    model,
    input: prompt,
  });

  return response.output_text;
}