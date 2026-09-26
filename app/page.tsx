import PolicyWorkspace from "../components/policy/PolicyWorkspace";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <header className="mb-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white shadow-sm">
                T
              </div>

              <div>
                <p className="text-sm font-bold tracking-[0.18em] text-blue-600">
                  TRACE
                </p>

                <p className="text-sm text-slate-500">
                  Policy & Public Sentiment Analyst
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                Microsoft Foundry
              </span>

              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                Azure AI Search
              </span>

              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                Azure Document Intelligence
              </span>
            </div>
          </div>

          <div className="mt-10 max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              Evidence-grounded policy analysis
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Turn policy evidence into clear,
              traceable insights.
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              Analyze policy documents, official public comments, and hearing
              testimony in one workspace while keeping every AI-generated claim
              connected to its source evidence.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {[
              "Policy documents",
              "Public comments",
              "Hearing testimony",
              "Evidence-grounded Q&A",
              "Leadership brief",
            ].map((feature) => (
              <span
                key={feature}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600"
              >
                {feature}
              </span>
            ))}
          </div>
        </header>

        <PolicyWorkspace />

        <footer className="mt-12 border-t border-slate-200 py-8">
          <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              TRACE — Evidence-grounded policy and public sentiment analysis.
            </p>

            <p>
              Built for the Microsoft CCI Innovation Challenge
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}