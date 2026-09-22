import { z } from "zod";

export const SourceTypeSchema = z.enum([
  "policy",
  "hearing",
  "public_comment",
  "news",
  "survey",
]);

export const SourceSchema = z.object({
  id: z.string(),
  type: SourceTypeSchema,
  title: z.string(),
  url: z.string().optional(),
});

export const EvidenceSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  sourceType: SourceTypeSchema,
  text: z.string(),
  section: z.string().optional(),
  page: z.number().optional(),
  timestampSec: z.number().optional(),
  speaker: z.string().optional(),
  url: z.string().optional(),
});

export const InsightSchema = z.object({
  id: z.string(),
  type: z.enum([
    "policy_change",
    "stakeholder_impact",
    "public_concern",
    "minority_view",
    "possible_misunderstanding",
    "emerging_issue",
  ]),
  claim: z.string(),
  stakeholders: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
  evidenceIds: z.array(z.string()),
  limitations: z.array(z.string()).default([]),
});

export const PolicyCaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  jurisdiction: z.string().optional(),
  agency: z.string().optional(),
  sources: z.array(SourceSchema),
  evidence: z.array(EvidenceSchema),
  insights: z.array(InsightSchema),
});

export type Source = z.infer<typeof SourceSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type Insight = z.infer<typeof InsightSchema>;
export type PolicyCase = z.infer<typeof PolicyCaseSchema>;