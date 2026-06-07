import { type NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';

const REVIEWER_EMAIL = '14soulemanesow@gmail.com';

export async function POST(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
  }

  let body: {
    case_id: string;
    title: string;
    risk_score: number;
    severity: string;
    total_exposure: number;
    accounts: string[];
    recommended_action?: string;
    urgency?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { case_id, title, risk_score, severity, total_exposure, accounts, recommended_action, urgency } = body;

  const resend = new Resend(apiKey);

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const { error } = await resend.emails.send({
    from: 'RingSight <onboarding@resend.dev>',
    to: REVIEWER_EMAIL,
    subject: `[RingSight] Case Flagged for Human Review — ${case_id}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e4e4e7;">

    <div style="background: #09090b; padding: 20px 24px;">
      <span style="color: #a1a1aa; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;">RingSight · Fraud Detection</span>
      <h1 style="color: #fff; font-size: 18px; font-weight: 700; margin: 6px 0 0;">Case Flagged for Human Review</h1>
    </div>

    <div style="padding: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #71717a; font-size: 13px; width: 140px;">Case ID</td>
          <td style="padding: 8px 0; font-family: monospace; font-size: 13px; font-weight: 600; color: #09090b;">${case_id}</td>
        </tr>
        <tr style="border-top: 1px solid #f4f4f5;">
          <td style="padding: 8px 0; color: #71717a; font-size: 13px;">Title</td>
          <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #09090b;">${title}</td>
        </tr>
        <tr style="border-top: 1px solid #f4f4f5;">
          <td style="padding: 8px 0; color: #71717a; font-size: 13px;">Risk Score</td>
          <td style="padding: 8px 0; font-size: 13px; font-weight: 700; color: ${risk_score >= 80 ? '#dc2626' : risk_score >= 60 ? '#d97706' : '#16a34a'};">${risk_score}/100</td>
        </tr>
        <tr style="border-top: 1px solid #f4f4f5;">
          <td style="padding: 8px 0; color: #71717a; font-size: 13px;">Severity</td>
          <td style="padding: 8px 0; font-size: 13px; color: #09090b;">${severity}</td>
        </tr>
        <tr style="border-top: 1px solid #f4f4f5;">
          <td style="padding: 8px 0; color: #71717a; font-size: 13px;">Total Exposure</td>
          <td style="padding: 8px 0; font-size: 13px; font-weight: 700; color: #09090b;">${formatMoney(total_exposure)}</td>
        </tr>
        <tr style="border-top: 1px solid #f4f4f5;">
          <td style="padding: 8px 0; color: #71717a; font-size: 13px;">Accounts</td>
          <td style="padding: 8px 0; font-size: 12px; font-family: monospace; color: #09090b;">${accounts.join(', ')}</td>
        </tr>
        ${recommended_action ? `
        <tr style="border-top: 1px solid #f4f4f5;">
          <td style="padding: 8px 0; color: #71717a; font-size: 13px;">Recommended Action</td>
          <td style="padding: 8px 0; font-size: 13px; color: #09090b;">${recommended_action}</td>
        </tr>` : ''}
        ${urgency ? `
        <tr style="border-top: 1px solid #f4f4f5;">
          <td style="padding: 8px 0; color: #71717a; font-size: 13px;">Urgency</td>
          <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: ${urgency === 'Immediate' ? '#dc2626' : '#d97706'};">${urgency}</td>
        </tr>` : ''}
      </table>

      <div style="margin-top: 20px; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px 16px;">
        <p style="margin: 0; font-size: 13px; color: #92400e; font-weight: 600;">⚑ Human review required</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #b45309;">This case was escalated by a RingSight analyst and requires manual investigation before any action is taken.</p>
      </div>
    </div>

    <div style="background: #f4f4f5; padding: 12px 24px; border-top: 1px solid #e4e4e7;">
      <p style="margin: 0; font-size: 11px; color: #a1a1aa;">Sent by RingSight · ${new Date().toUTCString()}</p>
    </div>
  </div>
</body>
</html>`,
  });

  if (error) {
    console.error('Resend error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
