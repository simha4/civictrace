import dotenv from "dotenv";

dotenv.config({
  path: ".env.local",
});

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

async function main() {
  const {
    ensureSearchIndex,
    uploadEvidence,
    searchEvidence,
  } = await import(
    "../lib/search/azure-search"
  );

  console.log(
    "Creating/verifying search index..."
  );

  await ensureSearchIndex();

  console.log(
    "Search index ready."
  );

  await uploadEvidence([
    {
      id: "page-1",
      caseId: "demo-case",
      sourceType: "policy",
      sourceTitle:
        "IT700 Syllabus",
      pageNumber: 1,
      content:
        "This course provides orientations on doctoral research to early-stage PhD Information Technology students.",
    },

    {
      id: "page-2",
      caseId: "demo-case",
      sourceType: "policy",
      sourceTitle:
        "IT700 Syllabus",
      pageNumber: 2,
      content:
        "Students are expected to actively participate in discussions, seminars, and projects.",
    },
  ]);

  console.log(
    "Evidence uploaded."
  );

  console.log(
    "Waiting for Azure Search indexing..."
  );

  await sleep(3000);

  console.log(
    "\nSearching for: students"
  );

  const studentMatches =
    await searchEvidence(
      "students"
    );

  console.dir(
    studentMatches,
    {
      depth: null,
    }
  );

  console.log(
    "\nSearching for: participate"
  );

  const participateMatches =
    await searchEvidence(
      "participate"
    );

  console.dir(
    participateMatches,
    {
      depth: null,
    }
  );
}

main().catch(
  (error) => {
    console.error(
      "\nAzure AI Search test failed:"
    );

    console.error(error);

    process.exit(1);
  }
);