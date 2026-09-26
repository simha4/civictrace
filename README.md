# TRACE

**Evidence-grounded policy and public sentiment analysis using Microsoft Foundry, Azure AI Search, and Azure Document Intelligence.**

## Overview

TRACE helps analysts review policy documents, official public comments, and hearing testimony in one evidence-grounded workspace.

Instead of generating unsupported summaries, TRACE links AI-generated claims back to exact source evidence such as:

- Policy pages
- Regulations.gov public comments and attachments
- Timestamped hearing transcript segments

The goal is to make AI-assisted policy analysis more transparent, reviewable, and useful for decision support.

## Core Features

- Upload and analyze policy PDFs
- Extract page-aware evidence using Azure Document Intelligence
- Load official public comments from Regulations.gov
- Analyze public comment stance, concerns, and recurring themes
- Import hearing transcripts from YouTube
- Convert captions into timestamped hearing segments
- Analyze hearing testimony with Microsoft Foundry
- Index policy, public comments, and hearing evidence in Azure AI Search
- Ask grounded questions across the full policy case
- Generate an evidence-grounded Leadership Brief
- Display limitations and representativeness warnings
- Validate AI-produced evidence references before showing them to users
- Preserve manual hearing transcript entry as a fallback

## Architecture

```text
Policy PDF
    ↓
Azure Document Intelligence
    ↓
Page-aware Policy Evidence
    │
    ├──────────────────────────────┐
    │                              │
Regulations.gov Comments     YouTube Hearing
    │                              │
Comment Attachments          Transcript Captions
    │                              │
Document Intelligence        Timestamped Segments
    │                              │
    └──────────────┬───────────────┘
                   ↓
             Azure AI Search
                   ↓
            Microsoft Foundry
                   ↓
      ┌────────────┼──────────────┐
      │            │              │
   Policy     Public/Hearing   Cross-Source
  Analysis       Analysis          Q&A
                   │
                   ↓
           Leadership Brief
                   ↓
         Evidence Traceability
```

## Technology

- Microsoft Foundry
- Azure AI Search
- Azure AI Document Intelligence
- Microsoft Entra ID / Azure RBAC
- Regulations.gov API
- SerpApi YouTube transcript retrieval
- Next.js
- TypeScript
- Tailwind CSS

## Responsible AI

- AI-generated claims are linked to source evidence
- Evidence IDs are validated server-side
- Raw evidence is separated from AI interpretation
- Submitted public comments are not treated as representative of the broader public
- Hearing transcript segments are treated as source evidence, not verified speaker identity
- Possible misunderstandings are labeled cautiously rather than asserted as fact
- Limitations are displayed explicitly
- Final judgment remains with the analyst

## Demo Workflow

1. Upload a policy PDF
2. Extract and index policy evidence
3. Load official public comments from Regulations.gov
4. Analyze public reaction and recurring themes
5. Import a related YouTube hearing or public-event transcript
6. Analyze timestamped transcript segments
7. Ask questions across policy, comments, and hearing evidence
8. Generate a Leadership Brief
9. Review the supporting evidence behind each insight

Example question:

```text
What implementation risks and stakeholder concerns appear across the policy, public comments, and hearing evidence?
```

## Demo Policy

```text
public/demo/CivicTrace_Community_Access_Implementation_Policy.pdf
```

The fictional demo policy covers:

- Public-service access
- A six-month implementation timeline
- Implementation costs
- Technology readiness
- Extension requests
- Enforcement and corrective action

## Local Setup

Install dependencies:

```bash
npm install
```

Create a `.env.local` file:

```env
FOUNDRY_PROJECT_ENDPOINT=
FOUNDRY_MODEL_NAME=gpt-5-mini

DOCUMENT_INTELLIGENCE_ENDPOINT=
DOCUMENT_INTELLIGENCE_API_KEY=

AZURE_SEARCH_ENDPOINT=
AZURE_SEARCH_INDEX=civictrace-evidence

REGULATIONS_API_KEY=
SERPAPI_API_KEY=
```

Sign in to Azure:

```bash
az login
```

Run the application:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Build check:

```bash
npm run build
```

## Security

- Secrets are stored in `.env.local`
- `.env.local` is excluded from Git
- Azure AI Search uses Microsoft Entra ID / RBAC instead of API keys
- API keys are never committed to the repository

## Status

Hackathon MVP complete with:

- Grounded policy analysis
- Regulations.gov public comment ingestion
- Public reaction and theme analysis
- YouTube hearing transcript ingestion
- Hearing testimony analysis
- Unified evidence search
- Cross-source evidence-grounded Q&A
- Leadership Brief generation
- Source traceability across policy, comments, and hearing evidence

## Team

Built for the **Microsoft CCI Innovation Challenge — Policy and Public Sentiment Analyst** challenge.

## Acknowledgments

Development assistance:

- ChatGPT by OpenAI — architecture guidance, debugging support, code review, and documentation assistance