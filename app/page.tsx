import { mockPolicyCase } from "../lib/data/mock-policy-case";

export default function Home() {
  const policyCase = mockPolicyCase;

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="mx-auto max-w-6xl">

        <div className="mb-8">
          <p className="text-sm font-semibold uppercase text-blue-600">
            CivicTrace
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            {policyCase.title}
          </h1>

          <p className="mt-2 text-gray-600">
            {policyCase.jurisdiction} · {policyCase.agency}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">Sources</p>
            <p className="mt-2 text-3xl font-bold">
              {policyCase.sources.length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">Insights</p>
            <p className="mt-2 text-3xl font-bold">
              {policyCase.insights.length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">Evidence Items</p>
            <p className="mt-2 text-3xl font-bold">
              {policyCase.evidence.length}
            </p>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold">
            Policy Insights
          </h2>

          <div className="mt-4 space-y-5">
            {policyCase.insights.map((insight) => {
              const evidence = policyCase.evidence.filter((item) =>
                insight.evidenceIds.includes(item.id)
              );

              return (
                <div
                  key={insight.id}
                  className="rounded-xl border bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                      {insight.type.replaceAll("_", " ")}
                    </span>

                    <span className="text-sm text-gray-500">
                      Confidence: {insight.confidence}
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-semibold">
                    {insight.claim}
                  </h3>

                  <p className="mt-2 text-sm text-gray-600">
                    Stakeholders: {insight.stakeholders.join(", ")}
                  </p>

                  <div className="mt-5 border-t pt-4">
                    <p className="font-medium">
                      Supporting Evidence
                    </p>

                    <div className="mt-3 space-y-3">
                      {evidence.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg bg-gray-50 p-4"
                        >
                          <p className="text-xs font-semibold uppercase text-gray-500">
                            {item.sourceType}
                          </p>

                          <p className="mt-1">
                            {item.text}
                          </p>

                          {item.section && (
                            <p className="mt-2 text-sm text-gray-500">
                              Section {item.section}
                              {item.page ? ` · Page ${item.page}` : ""}
                            </p>
                          )}

                          {item.timestampSec !== undefined && (
                            <p className="mt-2 text-sm text-gray-500">
                              Hearing timestamp:{" "}
                              {Math.floor(item.timestampSec / 60)}:
                              {String(item.timestampSec % 60).padStart(2, "0")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {insight.limitations.length > 0 && (
                    <div className="mt-5 rounded-lg bg-yellow-50 p-4 text-sm">
                      <strong>Limitation:</strong>{" "}
                      {insight.limitations.join(" ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}