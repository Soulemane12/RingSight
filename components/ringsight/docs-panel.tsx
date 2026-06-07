'use client';

export function DocsPanel() {
  return (
    <div className="max-w-3xl mx-auto px-8 py-12">
      <h1 className="text-3xl font-bold text-zinc-900 mb-1">RingSight Benchmark Dataset</h1>
      <p className="text-sm text-zinc-400 mb-10">Synthetic fraud detection dataset · Jan – Jun 2026</p>

      <Section title="Overview">
        <Row label="Total Rows" value="5,000" />
        <Row label="Unique Accounts" value="294" />
        <Row label="Internal Transfers" value="250" />
        <Row label="Date Range" value="January 1 – June 1, 2026" />
        <Row label="Total Suspicious Exposure" value="$161,751" />
        <Row label="Fraud Cases Detected" value="3 (2 Critical, 1 Medium)" />
      </Section>

      <Section title="CSV Columns">
        <Row label="txn_id" value="Unique transaction ID" mono />
        <Row label="account_id" value="Sending account" mono />
        <Row label="counterparty_id" value="Receiving account" mono />
        <Row label="amount" value="Transaction amount in USD" mono />
        <Row label="timestamp" value="ISO 8601 datetime" mono />
        <Row label="merchant_category" value="Category code e.g. TRANSFER, CASH" mono />
        <Row label="device_id" value="Device fingerprint" mono />
        <Row label="ip_region" value="Geographic region of IP" mono />
        <Row label="account_open_date" value="Date account was opened" mono />
      </Section>

      <Section title="Fraud Cases">
        <CaseRow id="CASE-001" score={99} severity="Critical" exposure="$51,748" accounts="AC-0001, AC-0002, AC-0005" pattern="Structured Smurfing" />
        <CaseRow id="CASE-002" score={88} severity="Critical" exposure="$83,017" accounts="AC-0010, AC-0011" pattern="Layering Chain" />
        <CaseRow id="CASE-003" score={64} severity="Medium"   exposure="$26,986" accounts="AC-0001" pattern="High-Velocity Pass-Through" />
      </Section>

      <Section title="Patterns Detected">
        <Row label="STRUCTURED_SMURFING" value="Multiple transfers just below $10k threshold to avoid SAR filing" mono />
        <Row label="LAYERING_CHAIN" value="Funds routed through 3+ accounts in sequence to obscure origin" mono />
        <Row label="HIGH_VELOCITY_PASS_THROUGH" value="Account receives and immediately re-sends funds within hours" mono />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">{title}</h2>
      <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-4 px-4 py-3 bg-white">
      <span className={`w-56 shrink-0 text-sm ${mono ? 'font-mono text-zinc-600' : 'text-zinc-500'}`}>{label}</span>
      <span className="text-sm text-zinc-800">{value}</span>
    </div>
  );
}

function CaseRow({ id, score, severity, exposure, accounts, pattern }: {
  id: string; score: number; severity: string; exposure: string; accounts: string; pattern: string;
}) {
  const color = severity === 'Critical' ? 'text-red-600' : 'text-amber-600';
  return (
    <div className="flex items-start gap-4 px-4 py-3 bg-white">
      <span className="w-56 shrink-0 font-mono text-sm text-zinc-600">{id}</span>
      <div className="text-sm text-zinc-800 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${color}`}>{score}/100</span>
          <span className="text-zinc-400">·</span>
          <span>{severity}</span>
          <span className="text-zinc-400">·</span>
          <span>{exposure}</span>
        </div>
        <div className="text-zinc-500">{pattern}</div>
        <div className="font-mono text-xs text-zinc-400">{accounts}</div>
      </div>
    </div>
  );
}
