import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  console.log(
    "Endpoint loaded:",
    Boolean(process.env.FOUNDRY_PROJECT_ENDPOINT)
  );

  console.log(
    "Model loaded:",
    Boolean(process.env.FOUNDRY_MODEL_NAME)
  );

  const { askFoundry } = await import("../lib/ai/foundry");

  const response = await askFoundry(
    "Reply exactly with: CivicTrace Foundry connected"
  );

  console.log(response);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});