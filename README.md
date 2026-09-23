# CivicTrace

Evidence-grounded policy and public sentiment analysis using Microsoft Foundry, Azure AI Search, and Azure Document Intelligence.

## Overview

CivicTrace helps analysts review policy documents, public comments, and hearing testimony in one evidence-grounded workspace.

Instead of generating unsupported summaries, CivicTrace links AI-generated claims back to exact source evidence such as:

- policy pages
- submitted public comments
- hearing speaker statements

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

Technology
Microsoft Foundry
Azure AI Search
Azure AI Document Intelligence
Microsoft Entra ID / Azure RBAC
Next.js
TypeScript
Tailwind CSS
Responsible AI
AI-generated claims are linked to source evidence
Evidence IDs are validated server-side
Raw evidence is separated from AI interpretation
Submitted feedback is not treated as representative of the broader public
Limitations are displayed explicitly
Final judgment remains with the analyst
Demo Workflow
Upload a policy PDF
Review extracted policy evidence
Add public comments
Add hearing testimony
Ask questions across all evidence
Generate a Leadership Brief
Review supporting evidence

Example:

What implementation risks appear across the policy and public feedback?
Demo Policy
public/demo/CivicTrace_Community_Access_Implementation_Policy.pdf

The fictional demo policy covers public-service access, a six-month implementation timeline, implementation costs, technology readiness, extensions, and enforcement.

Local Setup

Install dependencies:

npm install

Create .env.local:

FOUNDRY_PROJECT_ENDPOINT=
FOUNDRY_MODEL_NAME=gpt-5-mini
DOCUMENT_INTELLIGENCE_ENDPOINT=
DOCUMENT_INTELLIGENCE_API_KEY=
AZURE_SEARCH_ENDPOINT=
AZURE_SEARCH_INDEX=civictrace-evidence

Sign in to Azure and run:

az login
npm run dev

Open:

http://localhost:3000

Build check:

npm run build
Security

Secrets are stored in .env.local and excluded from Git. Azure AI Search uses Microsoft Entra ID / Azure RBAC.

Status

Hackathon MVP complete with:

grounded policy analysis
public sentiment analysis
hearing testimony analysis
unified evidence search
evidence-grounded Q&A
leadership brief generation
Team

Built for the Policy and Public Sentiment Analyst hackathon challenge.
