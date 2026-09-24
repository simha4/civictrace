import PolicyWorkspace from "../components/policy/PolicyWorkspace";

import { mockPolicyCase } from "../lib/data/mock-policy-case";

export default function Home() {

  const policyCase =

    mockPolicyCase;

  return (

    <main className="min-h-screen bg-gray-50 px-6 py-10 text-gray-900">

      <div className="mx-auto max-w-6xl">

        {/* Header */}

        <header className="mb-8">

          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">

            CivicTrace

          </p>

          <h1 className="mt-2 text-4xl font-bold">

            Policy & Public Sentiment Analyst

          </h1>

          <p className="mt-3 max-w-3xl text-gray-600">

            Turn policy documents, public feedback, hearing testimony, and

            related evidence into transparent, evidence-grounded insights.

          </p>

        </header>

        {/*

          Unified Policy Case

          Contains:

          - PDF upload

          - Azure AI Search indexing

          - public comments

          - hearing testimony

          - grounded Q&A

        */}

        <PolicyWorkspace />
        {/* Example Demo Case */}

        <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

          <div className="flex flex-wrap items-start justify-between gap-4">

            <div>

              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">

                Example Policy Case

              </p>

              <h2 className="mt-2 text-2xl font-bold">

                {

                  policyCase.title

                }

              </h2>

              {policyCase.agency && (

                <p className="mt-2 text-sm text-gray-600">

                  Agency:{" "}

                  {

                    policyCase.agency

                  }

                </p>

              )}

              {policyCase.jurisdiction && (

                <p className="mt-1 text-sm text-gray-600">

                  Jurisdiction:{" "}

                  {

                    policyCase.jurisdiction

                  }

                </p>

              )}

            </div>

            <div className="flex flex-wrap gap-2">

              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">

                {

                  policyCase

                    .sources

                    .length

                }{" "}

                sources

              </span>

              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">

                {

                  policyCase

                    .evidence

                    .length

                }{" "}

                evidence items

              </span>

              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">

                {

                  policyCase

                    .insights

                    .length

                }{" "}

                insights

              </span>

            </div>

          </div>

          {/* Sources */}

          <div className="mt-8">

            <h3 className="text-lg font-semibold">

              Sources

            </h3>

            <div className="mt-4 grid gap-4 md:grid-cols-2">

              {policyCase.sources.map(

                (

                  source

                ) => (

                  <article

                    key={

                      source.id

                    }

                    className="rounded-xl border border-gray-200 bg-gray-50 p-4"

                  >

                    <div className="flex flex-wrap items-center gap-2">

                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600">

                        {source.type.replaceAll(

                          "_",

                          " "

                        )}

                      </span>

                    </div>

                    <p className="mt-3 font-semibold">

                      {

                        source.title

                      }

                    </p>

                    {source.url && (

                      <p className="mt-2 break-all text-sm text-blue-600">

                        {

                          source.url

                        }

                      </p>

                    )}

                  </article>

                )

              )}

            </div>

          </div>

          {/* Insights */}

          <div className="mt-8">

            <h3 className="text-lg font-semibold">

              Evidence-grounded Insights

            </h3>

            <div className="mt-4 space-y-4">

              {policyCase.insights.map(

                (

                  insight

                ) => (

                  <article

                    key={

                      insight.id

                    }

                    className="rounded-xl border border-gray-200 p-5"

                  >

                    <div className="flex flex-wrap items-center gap-2">

                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">

                        {insight.type.replaceAll(

                          "_",

                          " "

                        )}

                      </span>

                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-700">

                        {

                          insight.confidence

                        }{" "}

                        confidence

                      </span>

                    </div>

                    <p className="mt-4 font-medium leading-7">

                      {

                        insight.claim

                      }

                    </p>

                    {insight.stakeholders.length >

                      0 && (

                      <div className="mt-4">

                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">

                          Stakeholders

                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">

                          {insight.stakeholders.map(

                            (

                              stakeholder

                            ) => (

                              <span

                                key={

                                  stakeholder

                                }

                                className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"

                              >

                                {

                                  stakeholder

                                }

                              </span>

                            )

                          )}

                        </div>

                      </div>

                    )}

                    {insight.evidenceIds.length >

                      0 && (

                      <div className="mt-4">

                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">

                          Evidence IDs

                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">

                          {insight.evidenceIds.map(

                            (

                              evidenceId

                            ) => (

                              <span

                                key={

                                  evidenceId

                                }

                                className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"

                              >

                                {

                                  evidenceId

                                }

                              </span>

                            )

                          )}

                        </div>

                      </div>

                    )}

                    {insight.limitations.length >

                      0 && (

                      <div className="mt-4 rounded-lg bg-yellow-50 p-4">

                        <p className="text-xs font-semibold uppercase tracking-wide text-yellow-800">

                          Limitations

                        </p>

                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-yellow-900">

                          {insight.limitations.map(

                            (

                              limitation,

                              index

                            ) => (

                              <li

                                key={

                                  index

                                }

                              >

                                {

                                  limitation

                                }

                              </li>

                            )

                          )}

                        </ul>

                      </div>

                    )}

                  </article>

                )

              )}

            </div>

          </div>

          {/* Evidence Library */}

          <div className="mt-8">

            <h3 className="text-lg font-semibold">

              Evidence Library

            </h3>

            <div className="mt-4 space-y-4">

              {policyCase.evidence.map(

                (

                  evidence

                ) => (

                  <article

                    key={

                      evidence.id

                    }

                    className="rounded-xl border border-gray-200 bg-gray-50 p-5"

                  >

                    <div className="flex flex-wrap items-center gap-2">

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">

                        {

                          evidence.id

                        }

                      </span>

                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">

                        {evidence.sourceType.replaceAll(

                          "_",

                          " "

                        )}

                      </span>

                      {evidence.page && (

                        <span className="text-sm text-gray-500">

                          Page{" "}

                          {

                            evidence.page

                          }

                        </span>

                      )}

                      {evidence.speaker && (

                        <span className="text-sm text-gray-500">

                          Speaker:{" "}

                          {

                            evidence.speaker

                          }

                        </span>

                      )}

                      {typeof evidence.timestampSec ===

                        "number" && (

                        <span className="text-sm text-gray-500">

                          Timestamp:{" "}

                          {

                            evidence.timestampSec

                          }

                          s

                        </span>

                      )}

                    </div>

                    <blockquote className="mt-4 border-l-4 border-blue-500 pl-4 text-sm leading-6 text-gray-700">

                      {

                        evidence.text

                      }

                    </blockquote>

                  </article>

                )

              )}

            </div>

          </div>

          {/* Trust Notice */}

          <div className="mt-8 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm leading-6 text-yellow-900">

            CivicTrace AI outputs are interpretations of source evidence, not

            final policy judgments. Analysts should review cited source

            material before relying on an insight. Public comments and hearing

            testimony describe the submitted sample and should not automatically

            be treated as representative of the broader public.

          </div>

        </section>

      </div>

    </main>

  );

}
