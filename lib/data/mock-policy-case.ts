import type { PolicyCase } from "../schemas/policy";

export const mockPolicyCase: PolicyCase = {
  id: "case-001",
  title: "Sample Public Safety Regulation",
  jurisdiction: "Virginia",
  agency: "Example State Agency",

  sources: [
    {
      id: "policy-v2",
      type: "policy",
      title: "Proposed Regulation - Version 2",
    },
    {
      id: "hearing-001",
      type: "hearing",
      title: "Public Hearing - September 2026",
    },
    {
      id: "comment-001",
      type: "public_comment",
      title: "Public Comment #1",
    },
  ],

  evidence: [
    {
      id: "evidence-001",
      sourceId: "policy-v2",
      sourceType: "policy",
      text: "Organizations must comply with the new reporting requirement within 30 days.",
      section: "8.2",
      page: 17,
    },
    {
      id: "evidence-002",
      sourceId: "hearing-001",
      sourceType: "hearing",
      text: "Thirty days may be difficult for smaller organizations to implement.",
      speaker: "Public Speaker",
      timestampSec: 2530,
    },
    {
      id: "evidence-003",
      sourceId: "comment-001",
      sourceType: "public_comment",
      text: "Small organizations may need additional time and resources to comply.",
    },
  ],

  insights: [
    {
      id: "insight-001",
      type: "public_concern",
      claim:
        "Smaller organizations raised concerns about the 30-day implementation timeline.",
      stakeholders: ["Small organizations"],
      confidence: "high",
      evidenceIds: ["evidence-001", "evidence-002", "evidence-003"],
      limitations: [
        "Public comments and hearing participants are self-selected and should not be treated as representative polling.",
      ],
    },
    {
      id: "insight-002",
      type: "stakeholder_impact",
      claim:
        "The proposed reporting requirement may create additional compliance work for regulated organizations.",
      stakeholders: ["Regulated organizations", "Compliance teams"],
      confidence: "medium",
      evidenceIds: ["evidence-001"],
      limitations: [],
    },
  ],
};