/**
 * Domain Expert research conducted via Geodo (geodo.ai) on 2026-06-07.
 *
 * Topics searched:
 *   1. Community bank fraud analyst workflow
 *   2. Fraud investigation case management
 *   3. Network-based transaction fraud detection
 *
 * Sources: swimlane.com/blog/fraud-case-management,
 *          quantexa.com/resources/aml-investigations-and-case-management,
 *          sumsub.com/blog/aml-investigation-and-case-management,
 *          financialcrimeacademy.org/performing-transaction-investigations,
 *          medium.com/@amistapuramk/graph-based-approaches-for-detecting-fraud-rings
 */

export const geodoResearch = {
  tool: "Geodo",
  researchedAt: "2026-06-07",
  topics: [
    "Community bank fraud analyst workflow",
    "Fraud case investigation",
    "Network-based fraud detection",
  ],
  findings: [
    {
      finding:
        "Fraud alert triage applies a disposition decision tree — close as false positive, escalate to case, or refer for enhanced due diligence. A case is assigned to an investigator who reviews the reason the alert was generated as well as the severity and exposure of the potential risk. Medium and high-severity cases escalate to the fraud operations manager, who evaluates whether containment actions are required and whether the case warrants regulatory reporting.",
      source: "swimlane.com/blog/fraud-case-management + quantexa.com/resources/aml-investigations-and-case-management",
      productDecision:
        "We place risk score, exposure, account count, and recommended action at the top of every case so analysts can triage in under 3 minutes without scrolling.",
    },
    {
      finding:
        "A strong AML programme maintains a clear evidence trail from risk identification through alert investigation to reporting decision — the trail must be examination-ready so supervisors can review how an alert was generated, how it was investigated, and why it was closed or reported. Investigators gather transaction records, communication logs, and device data to understand how the fraud occurred.",
      source: "sumsub.com/blog/aml-investigation-and-case-management + financialcrimeacademy.org/performing-transaction-investigations",
      productDecision:
        "Every fraud flag includes visible evidence and supporting transaction IDs. Pattern Evidence shows inline transaction citations (TX ID, sender→receiver, amount, timestamp) so the audit trail is built automatically.",
    },
    {
      finding:
        "Financial fraud increasingly operates through coordinated networks rather than isolated transactions — fraud rings, mule account chains, and synthetic identity clusters exploit relational structures that traditional transaction-level detection misses. Community detection identifies clusters indicating fraud rings; centrality measures pinpoint the influential nodes controlling fund movement, which are prioritized for investigation.",
      source: "medium.com/@amistapuramk/graph-based-approaches-for-detecting-fraud-rings + arxiv.org/pdf/2103.01854",
      productDecision:
        "RingSight's detection engine builds an account relationship graph and runs community detection before any LLM agent runs. Agent 4 generates a downloadable investigation report per case, including a network summary section that describes the ring structure for analyst review and sign-off.",
    },
  ],
} as const;

export type GeodoResearch = typeof geodoResearch;
