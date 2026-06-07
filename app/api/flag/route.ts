import { type NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';

const REVIEWER_EMAIL = '14soulemanesow@gmail.com';

interface ActionReasonEmail {
  reason_code?: string;
  explanation?: string;
  supporting_finding_ids?: string[];
  supporting_relationship_ids?: string[];
  supporting_transaction_ids?: string[];
}

interface FlagRequestBody {
  case_id: string;
  title: string;
  summary?: string;
  case_type?: string;
  risk_score: number;
  severity: string;
  total_exposure: number;
  transaction_count?: number;
  accounts: string[];
  relationship_ids?: string[];
  transaction_ids?: string[];
  connector_accounts?: string[];
  chains?: string[][];
  ranking_reasons?: string[];
  recommended_action?: string;
  urgency?: string;
  plain_english_action?: string;
  analyst_instructions?: string[];
  action_reasons?: ActionReasonEmail[];
  confidence?: number;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
  }

  let body: FlagRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    case_id,
    title,
    summary,
    case_type,
    risk_score,
    severity,
    total_exposure,
    transaction_count,
    accounts,
    relationship_ids,
    transaction_ids,
    connector_accounts,
    chains,
    ranking_reasons,
    recommended_action,
    urgency,
    plain_english_action,
    analyst_instructions,
    action_reasons,
    confidence,
  } = body;

  if (!case_id || !title || typeof risk_score !== 'number' || !Array.isArray(accounts)) {
    return NextResponse.json({ error: 'Missing required case fields' }, { status: 400 });
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: 'RingSight <onboarding@resend.dev>',
    to: REVIEWER_EMAIL,
    subject: `[RingSight] ${urgency === 'Immediate' ? 'Immediate review required' : 'Case flagged'} - ${case_id} (${risk_score}/100)`,
    html: buildFlagEmail({
      case_id,
      title,
      summary,
      case_type,
      risk_score,
      severity,
      total_exposure,
      transaction_count,
      accounts,
      relationship_ids,
      transaction_ids,
      connector_accounts,
      chains,
      ranking_reasons,
      recommended_action,
      urgency,
      plain_english_action,
      analyst_instructions,
      action_reasons,
      confidence,
    }),
  });

  if (error) {
    console.error('Resend error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function buildFlagEmail(body: FlagRequestBody): string {
  const {
    case_id,
    title,
    summary,
    case_type,
    risk_score,
    severity,
    total_exposure,
    transaction_count,
    accounts,
    relationship_ids = [],
    transaction_ids = [],
    connector_accounts = [],
    chains = [],
    ranking_reasons = [],
    recommended_action,
    urgency,
    plain_english_action,
    analyst_instructions = [],
    action_reasons = [],
    confidence,
  } = body;

  const isImmediate = urgency === 'Immediate';
  const accent = isImmediate ? '#7f1d1d' : '#9a3412';
  const accentText = isImmediate ? '#991b1b' : '#c2410c';
  const accentBg = isImmediate ? '#fee2e2' : '#ffedd5';
  const accentBorder = isImmediate ? '#fecaca' : '#fed7aa';
  const displayAction = recommended_action ? actionLabel(recommended_action) : 'Human review';
  const chainText = chains.length > 0
    ? chains.map(chain => chain.join(' -> ')).join('; ')
    : 'No chain identified';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 24px;">
  <div style="max-width: 680px; margin: 0 auto; background: #fff; border-radius: 14px; overflow: hidden; border: 1px solid #e4e4e7;">

    <div style="background: ${accent}; padding: 24px;">
      <span style="color: #fecaca; font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;">RingSight fraud escalation</span>
      <h1 style="color: #fff; font-size: 24px; font-weight: 800; margin: 8px 0 0;">${escapeHtml(case_id)} requires human review</h1>
      <p style="color: #fee2e2; font-size: 14px; margin: 8px 0 0;">${escapeHtml(title)}</p>
    </div>

    <div style="padding: 24px;">
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 20px;">
        ${metricBox('Risk Score', `${risk_score}/100`, accentText, accentBg, accentBorder)}
        ${metricBox('Total Funds at Risk', formatMoney(total_exposure), '#09090b', '#f8fafc', '#e4e4e7')}
        ${metricBox('Transactions', String(transaction_count ?? transaction_ids.length), '#09090b', '#f8fafc', '#e4e4e7')}
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
        ${tableRow('Case ID', case_id, true)}
        ${tableRow('Severity', severity)}
        ${tableRow('Urgency', urgency ?? 'Not provided', false, isImmediate ? accentText : '#d97706')}
        ${tableRow('Recommended Action', displayAction)}
        ${confidence !== undefined ? tableRow('Agent Confidence', `${Math.round(confidence * 100)}%`) : ''}
        ${case_type ? tableRow('Case Type', humanizeToken(case_type)) : ''}
        ${tableRow('Accounts', compactIds(accounts), true)}
        ${tableRow('Connector Accounts', compactIds(connector_accounts), true)}
        ${tableRow('Relationships', compactIds(relationship_ids), true)}
        ${tableRow('Transaction IDs', compactIds(transaction_ids), true)}
      </table>

      ${summary ? section('Case Summary', `<p style="margin: 0; color: #3f3f46; font-size: 14px; line-height: 1.6;">${escapeHtml(summary)}</p>`) : ''}

      <div style="margin-top: 18px; background: ${accentBg}; border: 1px solid ${accentBorder}; border-radius: 10px; padding: 16px;">
        <p style="margin: 0; font-size: 13px; color: ${accentText}; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;">Action required</p>
        <p style="margin: 8px 0 0; font-size: 14px; color: #3f3f46; line-height: 1.6;">${escapeHtml(plain_english_action ?? 'Review the case details and decide whether to restrict accounts, escalate, or close the case.')}</p>
      </div>

      ${analyst_instructions.length > 0 ? section(
        'Analyst Instructions',
        `<ol style="margin: 0; padding-left: 20px; color: #3f3f46; font-size: 14px; line-height: 1.7;">${analyst_instructions.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`,
      ) : ''}

      ${ranking_reasons.length > 0 ? section(
        'Why This Was Flagged',
        `<ul style="margin: 0; padding-left: 18px; color: #3f3f46; font-size: 14px; line-height: 1.7;">${ranking_reasons.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`,
      ) : ''}

      ${action_reasons.length > 0 ? section(
        'Agent Reasoning',
        action_reasons.map(reason => `
          <div style="border: 1px solid #e4e4e7; border-radius: 8px; padding: 12px; margin-bottom: 10px; background: #fafafa;">
            <p style="margin: 0; font-size: 12px; color: #71717a; font-weight: 800; text-transform: uppercase;">${escapeHtml(humanizeToken(reason.reason_code ?? 'Reason'))}</p>
            <p style="margin: 5px 0 0; font-size: 13px; color: #3f3f46; line-height: 1.5;">${escapeHtml(reason.explanation ?? '')}</p>
            <p style="margin: 7px 0 0; font-size: 11px; color: #71717a; font-family: monospace;">Findings: ${escapeHtml(compactIds(reason.supporting_finding_ids ?? [], 6))} | Relationships: ${escapeHtml(compactIds(reason.supporting_relationship_ids ?? [], 6))} | Txns: ${escapeHtml(compactIds(reason.supporting_transaction_ids ?? [], 6))}</p>
          </div>
        `).join(''),
      ) : ''}

      <div style="margin-top: 18px; border: 1px solid #e4e4e7; border-radius: 10px; padding: 14px; background: #fafafa;">
        <p style="margin: 0; font-size: 12px; color: #71717a; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;">Network context</p>
        <p style="margin: 7px 0 0; font-size: 13px; color: #3f3f46; line-height: 1.5;">Accounts: <span style="font-family: monospace;">${escapeHtml(compactIds(accounts, 20))}</span></p>
        <p style="margin: 5px 0 0; font-size: 13px; color: #3f3f46; line-height: 1.5;">Chains: <span style="font-family: monospace;">${escapeHtml(chainText)}</span></p>
      </div>
    </div>

    <div style="background: #f4f4f5; padding: 14px 24px; border-top: 1px solid #e4e4e7;">
      <p style="margin: 0; font-size: 11px; color: #71717a;">Sent by RingSight at ${escapeHtml(new Date().toUTCString())}. This is an analyst-support alert, not a final fraud determination.</p>
    </div>
  </div>
</body>
</html>`;
}

function metricBox(label: string, value: string, color: string, bg: string, border: string): string {
  return `
    <div style="background: ${bg}; border: 1px solid ${border}; border-radius: 10px; padding: 12px;">
      <p style="margin: 0; color: #71717a; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;">${escapeHtml(label)}</p>
      <p style="margin: 5px 0 0; color: ${color}; font-size: 20px; font-weight: 800; font-family: monospace;">${escapeHtml(value)}</p>
    </div>`;
}

function tableRow(label: string, value: string, mono = false, color = '#09090b'): string {
  return `
    <tr style="border-top: 1px solid #f4f4f5;">
      <td style="padding: 9px 0; color: #71717a; font-size: 13px; width: 150px;">${escapeHtml(label)}</td>
      <td style="padding: 9px 0; font-size: 13px; font-weight: 600; color: ${color}; ${mono ? 'font-family: monospace;' : ''}">${escapeHtml(value)}</td>
    </tr>`;
}

function section(title: string, content: string): string {
  return `
    <div style="margin-top: 18px;">
      <h2 style="margin: 0 0 8px; color: #18181b; font-size: 15px; font-weight: 800;">${escapeHtml(title)}</h2>
      ${content}
    </div>`;
}

function compactIds(ids: string[] = [], limit = 12): string {
  if (ids.length === 0) return 'None';
  const shown = ids.slice(0, limit);
  const suffix = ids.length > limit ? ` (+${ids.length - limit} more)` : '';
  return `${shown.join(', ')}${suffix}`;
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    MONITOR: 'Monitor',
    INVESTIGATE: 'Investigate',
    ESCALATE: 'Escalate',
    TEMPORARILY_RESTRICT_AND_ESCALATE: 'Restrict & Escalate',
    REQUEST_ENHANCED_REVIEW: 'Enhanced Review',
  };
  return map[action] ?? humanizeToken(action);
}

function humanizeToken(value: string): string {
  return value
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
