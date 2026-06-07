import type { CaseInvestigationReport } from './types';

const ACTION_LABEL: Record<string, string> = {
  TEMPORARILY_RESTRICT_AND_ESCALATE: 'Temporarily restrict and escalate',
  ESCALATE: 'Escalate to fraud investigation queue',
  INVESTIGATE: 'Open analyst investigation',
  REQUEST_ENHANCED_REVIEW: 'Request enhanced account review',
  MONITOR: 'Continue monitoring',
};

export function generateMarkdown(report: Omit<CaseInvestigationReport, 'markdown'>): string {
  const actionLabel = ACTION_LABEL[report.recommended_action] ?? report.recommended_action;
  const date = report.generated_at.slice(0, 10);

  const evidenceSections = report.key_evidence
    .map(
      (ev, i) =>
        `### Evidence ${i + 1} — ${ev.heading}\n\n${ev.body}`,
    )
    .join('\n\n');

  const txnList =
    report.transaction_ids.length > 0
      ? report.transaction_ids.map(id => `- ${id}`).join('\n')
      : '- None listed';

  const accountList = report.accounts.map(id => `- ${id}`).join('\n');

  return `# Fraud Investigation Brief — ${report.case_id}

**Report ID:** ${report.report_id}
**Run ID:** ${report.run_id}
**Generated:** ${date}

---

**Risk Level:** ${report.severity}
**Risk Score:** ${report.risk_score}/100
**Recommended Action:** ${actionLabel}
**Urgency:** ${report.urgency}
**Total Exposure:** $${report.total_exposure.toLocaleString()}

---

## Executive Summary

${report.executive_summary}

---

## Accounts Involved

${accountList}

**Relationships flagged:** ${report.relationship_ids.join(', ') || 'None'}

---

## Risk and Exposure

| Metric | Value |
|---|---|
| Risk Score | ${report.risk_score}/100 |
| Risk Level | ${report.severity} |
| Total Exposure | $${report.total_exposure.toLocaleString()} |
| Accounts | ${report.accounts.length} |

---

## Key Evidence

${evidenceSections || '_No evidence sections provided._'}

**Supporting Transaction IDs:**

${txnList}

---

## Network Behavior

${report.network_summary}

---

## Recommended Action

${report.action_summary}

---

## Limitations

${report.limitations}

---

## Analyst Sign-Off

${report.analyst_signoff}
`;
}
