'use client';

import { Database, FileText, Network, ShieldAlert, Brain, FileBarChart2, ExternalLink } from 'lucide-react';

export function DocsPanel() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Documentation</h1>
        <p className="text-sm text-zinc-500 mt-1">Dataset details, CSV format, agent pipeline, and how RingSight works.</p>
      </div>

      {/* Dataset overview */}
      <Section icon={Database} title="Benchmark Dataset">
        <p className="text-sm text-zinc-600 leading-relaxed mb-4">
          The demo dataset is a synthetic fraud benchmark generated to represent real-world community bank transaction patterns.
          It was structured to contain both clean transactions and planted fraud patterns at sub-alert-threshold levels.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatBox label="Total Rows" value="5,000" />
          <StatBox label="Unique Accounts" value="294" />
          <StatBox label="Internal Transfers" value="250" />
          <StatBox label="Date Range" value="Jan – Jun 2026" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatBox label="Fraud Cases Found" value="3" sub="2 Critical · 1 Medium" />
          <StatBox label="Total Exposure" value="$161,751" sub="across all cases" />
          <StatBox label="Suspicious Patterns" value="3" sub="smurfing · layering · velocity" />
        </div>
      </Section>

      {/* CSV format */}
      <Section icon={FileText} title="CSV Format">
        <p className="text-sm text-zinc-600 mb-4">
          Upload any CSV with the following required columns. Column order does not matter.
          Values are case-insensitive. Extra columns are ignored.
        </p>
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-zinc-700">Column</th>
                <th className="text-left px-4 py-2.5 font-semibold text-zinc-700">Type</th>
                <th className="text-left px-4 py-2.5 font-semibold text-zinc-700">Description</th>
                <th className="text-left px-4 py-2.5 font-semibold text-zinc-700">Example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {CSV_COLUMNS.map(col => (
                <tr key={col.name} className="hover:bg-zinc-50">
                  <td className="px-4 py-2.5 font-mono text-zinc-800 font-semibold">{col.name}</td>
                  <td className="px-4 py-2.5 text-zinc-500">{col.type}</td>
                  <td className="px-4 py-2.5 text-zinc-600">{col.desc}</td>
                  <td className="px-4 py-2.5 font-mono text-zinc-400">{col.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-400 mt-2">Max file size: 50 MB. UTF-8 encoding required.</p>
      </Section>

      {/* Fraud patterns detected */}
      <Section icon={ShieldAlert} title="Fraud Patterns Detected">
        <div className="space-y-3">
          {PATTERNS.map(p => (
            <div key={p.code} className="flex gap-3 p-3 rounded-lg bg-zinc-50 border border-zinc-200">
              <span className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${p.color}`} />
              <div>
                <p className="text-xs font-mono font-semibold text-zinc-700">{p.code}</p>
                <p className="text-sm font-semibold text-zinc-900 mt-0.5">{p.label}</p>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Agent pipeline */}
      <Section icon={Brain} title="AI Agent Pipeline">
        <p className="text-sm text-zinc-600 mb-4">
          RingSight runs a 4-agent pipeline sequentially. Each agent reads from the previous one and optionally from Cognee memory.
        </p>
        <div className="space-y-3">
          {AGENTS.map((agent, i) => (
            <div key={agent.name} className="flex gap-4 items-start">
              <div className="shrink-0 w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900">{agent.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{agent.desc}</p>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {agent.badges.map(b => (
                    <span key={b} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-mono border border-zinc-200">{b}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Demo cases */}
      <Section icon={FileBarChart2} title="Demo Dataset — Fraud Cases">
        <div className="space-y-3">
          {DEMO_CASES.map(c => (
            <div key={c.id} className="rounded-lg border border-zinc-200 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-zinc-500">{c.id}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${c.badge}`}>{c.severity}</span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 mt-1">{c.title}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-zinc-900">{c.score}/100</p>
                  <p className="text-xs text-zinc-500">risk score</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3 text-xs text-zinc-600">
                <div><span className="font-semibold block text-zinc-800">{c.exposure}</span>exposure</div>
                <div><span className="font-semibold block text-zinc-800">{c.accounts}</span>accounts</div>
                <div><span className="font-semibold block text-zinc-800">{c.action}</span>action</div>
              </div>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Data sources */}
      <Section icon={Network} title="Data Sources & Tools">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DATA_SOURCES.map(s => (
            <div key={s.name} className="flex gap-3 p-3 rounded-lg border border-zinc-200 bg-zinc-50">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
              <div>
                <p className="text-sm font-semibold text-zinc-800">{s.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-zinc-100 bg-zinc-50">
        <Icon className="w-4 h-4 text-zinc-500" />
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-lg font-bold text-zinc-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  );
}

const CSV_COLUMNS = [
  { name: 'txn_id',           type: 'string',   desc: 'Unique transaction identifier',              example: 'TX-00001' },
  { name: 'account_id',       type: 'string',   desc: 'Sending account ID',                         example: 'AC-0001' },
  { name: 'counterparty_id',  type: 'string',   desc: 'Receiving account ID',                       example: 'AC-0002' },
  { name: 'amount',           type: 'number',   desc: 'Transaction amount in USD',                  example: '9800.00' },
  { name: 'timestamp',        type: 'datetime', desc: 'ISO 8601 transaction timestamp',              example: '2026-01-15T08:23:00Z' },
  { name: 'merchant_category', type: 'string',  desc: 'Category code (e.g. TRANSFER, CASH)',        example: 'TRANSFER' },
  { name: 'device_id',        type: 'string',   desc: 'Device fingerprint used for the transaction', example: 'DEV-ABC123' },
  { name: 'ip_region',        type: 'string',   desc: 'Geographic region of the IP address',        example: 'US-TX' },
  { name: 'account_open_date', type: 'date',    desc: 'Date the account was opened',                example: '2023-06-01' },
];

const PATTERNS = [
  {
    code: 'STRUCTURED_SMURFING',
    label: 'Structured Smurfing',
    desc: 'Multiple transactions just below reporting thresholds ($10,000) sent from the same account to different counterparties within a short window. Designed to evade automatic SAR filing.',
    color: 'bg-red-500',
  },
  {
    code: 'LAYERING_CHAIN',
    label: 'Layering Chain',
    desc: 'A sequence of accounts passing funds through in order (A → B → C → ...) to obscure the original source. The engine detects chains of 3+ hops as suspicious.',
    color: 'bg-orange-500',
  },
  {
    code: 'HIGH_VELOCITY_PASS_THROUGH',
    label: 'High-Velocity Pass-Through',
    desc: 'An account that receives funds and immediately re-sends them (within hours), suggesting a mule account being used to launder funds.',
    color: 'bg-amber-500',
  },
];

const AGENTS = [
  {
    name: 'Agent 1 — Pattern Finder',
    desc: 'Scans every relationship in the engine output for smurfing, layering chains, and high-velocity behavior. Stores findings in Cognee for downstream agents.',
    badges: ['gpt-4o', 'Cognee write', 'structured output'],
  },
  {
    name: 'Agent 2 — Case Ranker',
    desc: 'Groups findings into fraud cases, scores each case 0–100 using a weighted formula (pattern confidence × 0.60 + exposure × 0.25 + bonuses), and ranks them by priority.',
    badges: ['gpt-4o', 'Cognee read + write', 'risk scoring'],
  },
  {
    name: 'Agent 3 — Action Recommender',
    desc: 'Applies action policy to each ranked case: score ≥ 90 → Restrict & Escalate (Immediate); score ≥ 70 → Enhanced Review (High); score < 70 → Monitor (Medium).',
    badges: ['gpt-4o', 'Cognee read + write', 'policy engine'],
  },
  {
    name: 'Agent 4 — Report Writer',
    desc: 'Recalls all prior agents from Cognee and writes a full investigation report per case including executive summary, key evidence, network behavior, action summary, and analyst sign-off. Informed by Geodo domain research.',
    badges: ['gpt-4o', 'Cognee read + write', 'Geodo research', 'markdown report'],
  },
];

const DEMO_CASES = [
  {
    id: 'CASE-001',
    title: 'Structured Smurfing Ring via AC-0001',
    severity: 'Critical',
    score: 99,
    exposure: '$51,748',
    accounts: '3',
    action: 'Restrict & Escalate',
    badge: 'bg-red-50 text-red-700 border-red-200',
    desc: 'AC-0001 sent nine structured transfers just below $10k to AC-0002 and AC-0005 over 72 hours. AC-0001 also acts as a connector in a 3-hop layering chain.',
  },
  {
    id: 'CASE-002',
    title: 'Multi-Account Layering Network',
    severity: 'Critical',
    score: 88,
    exposure: '$83,017',
    accounts: '2',
    action: 'Restrict & Escalate',
    badge: 'bg-red-50 text-red-700 border-red-200',
    desc: 'AC-0010 passes large sums to AC-0011 within hours of receipt. Both accounts were opened within 90 days. High pass-through velocity is the primary signal.',
  },
  {
    id: 'CASE-003',
    title: 'Elevated-Velocity Transfer Activity',
    severity: 'Medium',
    score: 64,
    exposure: '$26,986',
    accounts: '1',
    action: 'Enhanced Review',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    desc: 'AC-0001 shows high-velocity pass-through behavior in isolation. Shares accounts with CASE-001, suggesting it may be a mule account within a broader network.',
  },
];

const DATA_SOURCES = [
  { name: 'Kaggle Benchmark Dataset', desc: 'Synthetic financial transaction dataset used as the basis for the demo CSV.' },
  { name: 'Geodo Domain Research', desc: 'Fraud analyst workflow, case management, and network detection research used to design the agent pipeline and UI.' },
  { name: 'Cognee Memory', desc: 'Agentic memory layer. Each agent stores its output so downstream agents can recall context across the pipeline.' },
  { name: 'OpenAI GPT-4o', desc: 'Powers all four AI agents for pattern analysis, case ranking, action recommendation, and report writing.' },
  { name: 'TruPeer', desc: 'Project collaboration and peer review platform used during development.' },
  { name: 'LingCode.dev', desc: 'AI-assisted coding environment used to accelerate agent development.' },
];
