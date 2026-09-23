cat > README.md <<'EOF'
# CivicTrace

**Evidence-grounded policy and public sentiment analysis using Microsoft Foundry, Azure AI Search, and Azure Document Intelligence.**

## Overview

CivicTrace helps analysts review policy documents, public comments, and hearing testimony in one evidence-grounded workspace.

Instead of generating unsupported summaries, CivicTrace links AI-generated claims back to exact source evidence such as:

- Policy pages
- Submitted public comments
- Hearing speaker statements

The goal is to make AI-assisted policy analysis more transparent, reviewable, and useful for decision support.

## Core Features

- Upload and analyze policy PDFs
- Extract page-aware evidence using Azure Document Intelligence
- Index policy, public comments, and hearing testimony in Azure AI Search
- Ask grounded questions across the full case
- Analyze public comment stance and recurring concerns
- Analyze public hearing testimony with speaker-linked evidence
- Generate an evidence-grounded Leadership Brief
- Display limitations and representativeness warnings
- Validate AI-produced evidence references before showing them to users

## Architecture

```text
Policy PDF
   ↓
Azure Document Intelligence
   ↓
Page-aware Evidence
   │
   ├───────────────┐
   │               │
Public Comments    Hearing Testimony
   │               │
   └───────┬───────┘
           ↓
     Azure AI Search
           ↓
    Microsoft Foundry
           ↓
 ┌─────────┼──────────────┐
 │         │              │
Q&A     Analysis    Leadership Brief
           ↓
    Evidence Traceability
```

## Technology

- Microsoft Foundry
- Azure AI Search
- Azure AI Document Intelligence
- Microsoft Entra ID / Azure RBAC
- Next.js
- TypeScript
- Tailwind CSS

## Responsible AI

- AI-generated claims are linked to source evidence
- Evidence IDs are validated server-side
- Raw evidence is separated from AI interpretation
- Submitted feedback is not treated as representative of the broader public
- Limitations are displayed explicitly
- Final judgment remains with the analyst

## Demo Workflow

1. Upload a policy PDF
2. Review extracted policy evidence
3. Add public comments
4. Add hearing testimony
5. Ask questions across all evidence
6. Generate a Leadership Brief
7. Review supporting evidence

Example question:

```text
What implementation risks appear across the policy and public feedback?
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

## Status

Hackathon MVP complete with:

- Grounded policy analysis
- Public sentiment analysis
- Hearing testimony analysis
- Unified evidence search
- Evidence-grounded Q&A
- Leadership Brief generation

## Team

Built for the **Policy and Public Sentiment Analyst** hackathon challenge.


## Acknowledgments

Development assistance:
- ChatGPT by OpenAI — architecture guidance, debugging support, code review, and documentation assistance
