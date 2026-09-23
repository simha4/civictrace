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
