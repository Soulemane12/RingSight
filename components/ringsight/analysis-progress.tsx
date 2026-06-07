'use client';

import { CheckCircle, Loader } from 'lucide-react';
import { AgentStepCard } from './agent-step-card';
import { RunningTicker } from './running-ticker';
import { formatMoney, severityColor, actionLabel, urgencyBadge } from '@/lib/ui/format';
import type {
  AnalysisEvent,
  LiveFinding,
  LiveCase,
  LiveAction,
  EngineHighlight,
  ComponentHighlight,
} from '@/lib/ui/types';
import type { TickerLine } from './running-ticker';

interface AnalysisProgressProps {
  runId: string | null;
  events: AnalysisEvent[];
  rowCount?: number;
}

type AgentStatus = 'waiting' | 'running' | 'completed' | 'failed';

interface AgentState {
  status: AgentStatus;
  summary?: string;
  cogneeRead?: boolean;
  cogneeWrite?: boolean;
  findings?: LiveFinding[];
  cases?: LiveCase[];
  actions?: LiveAction[];
}

function deriveAgentState(agentNum: 1 | 2 | 3 | 4, events: AnalysisEvent[]): AgentState {
  const started = events.some(e => e.type === 'agent_started' && e.agent === agentNum);
  const completed = events.find(e => e.type === 'agent_completed' && e.agent === agentNum);
  const failed = events.some(e => e.type === 'run_failed');

  if (completed?.type === 'agent_completed') {
    return {
      status: 'completed',
      summary: completed.summary,
      cogneeRead: completed.cognee_read,
      cogneeWrite: completed.cognee_write,
      findings: completed.findings,
      cases: completed.cases,
      actions: completed.actions,
    };
  }
  if (failed && !started) return { status: 'waiting' };
  if (started) return { status: 'running' };
  return { status: 'waiting' };
}

function deriveEngineStatus(events: AnalysisEvent[]): 'waiting' | 'running' | 'done' {
  if (events.some(e => e.type === 'engine_completed')) return 'done';
  if (events.some(e => e.type === 'run_started')) return 'running';
  return 'waiting';
}

function getEngineData(events: AnalysisEvent()) {
  const ev = events.find(e => e.type === 'engine_completed');
  if (ev?.type !== 'engine_completed') return null;
  return { metrics: ev.metrics, highlights: ev.highlights };
}

// ── Ticker line generators ─────────────────────────────────────────────────

function flagLabel(f: string) {
  return f.replace(/_/g, ' ').toLowerCase();
}

function agent1Lines(
  metrics: { internal_transfer_count: number; account_count: number } | null,
  rels: EngineHighlight[],
  comps: ComponentHighlight[],
): TickerLine[] {
  const lines: TickerLine[] = [];

  lines.push({ text: `Initialising pattern-finder across ${metrics?.account_count ?? '?'} accounts…`, type: 'system' });
  lines.push({ text: `Loading ${metrics?.internal_transfer_count ?? '?'} internal transfers into analysis pipeline…`, type: 'system' });
  lines.push({ text: 'Building sender-receiver graph…', type: 'dim' });

  for (const rel of rels) {
    lines.push({
      text: `Examining ${rel.edge_id}  ${rel.sender} → ${rel.receiver}  (${rel.txn_count} txns · ${formatMoney(rel.exposure)})`,
    });
    for (const f of rel.flags) {
      const isCritical = rel.risk_score >= 85;
      lines.push({
        text: `  ⚑ ${flagLabel(f)} (risk score ${rel.risk_score})`,
        type: isCritical ? 'critical' : 'flag',
      });
    }
  }

  if (comps.length > 0) {
    lines.push({ text: 'Detecting weakly-connected components…', type: 'system' });
    for (const comp of comps) {
      lines.push({
        text: `${comp.component_id}  [${comp.accounts.join(' · ')}]  score ${comp.risk_score}${comp.has_chain ? '  ↳ chain detected' : ''}`,
        type: comp.risk_score >= 85 ? 'critical' : 'normal',
      });
    }
  }

  lines.push({ text: 'Calling gpt-4o → report_fraud_patterns…', type: 'system' });
  lines.push({ text: 'Model classifying suspicious behaviour…', type: 'dim' });

  return lines;
}

function agent2Lines(findings: LiveFinding[]): TickerLine[] {
  const lines: TickerLine[] = [];

  lines.push({ text: 'Recalling Agent 1 findings from Cognee memory…', type: 'system' });
  lines.push({ text: `${findings.length} finding${findings.length !== 1 ? 's' : ''} retrieved`, type: 'dim' });

  for (const f of findings) {
    lines.push({
      text: `Linking ${f.finding_id} [${f.pattern_type.replace(/_/g, ' ')}]  ${f.accounts.slice(0, 2).join(' → ')}  conf ${Math.round(f.confidence * 100)}%`,
    });
  }

  lines.push({ text: 'Scoring: risk_score × 0.60 + finding_score × 0.25 + bonuses…', type: 'dim' });
  lines.push({ text: 'Applying exposure bonus (+10 ≥ $75k  · +7 ≥ $50k  · +4 ≥ $25k)…', type: 'dim' });
  lines.push({ text: 'Applying chain bonus (+5 if chain present)…', type: 'dim' });
  lines.push({ text: 'Applying connector bonus (+5 if hub accounts exist)…', type: 'dim' });
  lines.push({ text: 'Sorting by composite fraud score…', type: 'system' });
  lines.push({ text: 'Calling gpt-4o → rank_fraud_cases…', type: 'system' });
  lines.push({ text: 'Model generating case summaries…', type: 'dim' });

  return lines;
}

function agent3Lines(cases: LiveCase[]): TickerLine[] {
  const lines: TickerLine[] = [];

  lines.push({ text: 'Recalling ranked cases from Cognee memory…', type: 'system' });

  for (const c of cases) {
    lines.push({
      text: `Evaluating ${c.case_id}  score ${c.risk_score}  ${c.severity}  ${formatMoney(c.total_exposure)}…`,
    });

    if (c.risk_score >= 90 && c.total_exposure >= 50_000) {
      lines.push({ text: `  → score ≥ 90 AND exposure ≥ $50k → TEMPORARILY_RESTRICT_AND_ESCALATE`, type: 'critical' });
      lines.push({ text: '  → urgency: Immediate', type: 'critical' });
    } else if (c.risk_score >= 85) {
      lines.push({ text: `  → score ≥ 85 → ESCALATE  urgency: High`, type: 'flag' });
    } else if (c.risk_score >= 65) {
      lines.push({ text: `  → score ≥ 65 → INVESTIGATE  urgency: High`, type: 'flag' });
    } else if (c.risk_score >= 40) {
      lines.push({ text: `  → score ≥ 40 → REQUEST_ENHANCED_REVIEW  urgency: Medium`, type: 'normal' });
    } else {
      lines.push({ text: `  → MONITOR  urgency: Low`, type: 'dim' });
    }
  }

  lines.push({ text: 'Computing action confidence scores…', type: 'dim' });
  lines.push({ text: 'Building analyst instruction sets…', type: 'system' });
  lines.push({ text: 'Calling gpt-4o → recommend_actions…', type: 'system' });
  lines.push({ text: 'Model phrasing plain-English recommendations…', type: 'dim' });

  return lines;
}

function agent4Lines(cases: LiveCase[], actions: LiveAction[]): TickerLine[] {
  const actionMap = new Map(actions.map(a => [a.case_id, a]));
  const lines: TickerLine[] = [];

  lines.push({ text: 'Recalling Agents 1, 2 & 3 from Cognee memory…', type: 'system' });
  lines.push({ text: `${cases.length} case${cases.length !== 1 ? 's' : ''} · ${actions.length} action plan${actions.length !== 1 ? 's' : ''} retrieved`, type: 'dim' });

  for (const c of cases) {
    const action = actionMap.get(c.case_id);
    lines.push({
      text: `Drafting investigation report for ${c.case_id} [${c.severity}]…`,
      type: 'system',
    });
    if (action) {
      lines.push({
        text: `  → action: ${action.recommended_action.replace(/_/g, ' ')}  urgency: ${action.urgency}`,
        type: action.urgency === 'Immediate' ? 'critical' : 'flag',
      });
    }
  }

  lines.push({ text: 'Embedding evidence citations from Agent 1 findings…', type: 'dim' });
  lines.push({ text: 'Cross-referencing Agent 3 action plans…', type: 'dim' });
  lines.push({ text: 'Applying 7 legal-conclusion review filters…', type: 'dim' });
  lines.push({ text: 'Generating analyst sign-off blocks…', type: 'dim' });
  lines.push({ text: 'Calling gpt-4o → write_investigation_reports…', type: 'system' });
  lines.push({ text: 'Model writing reports…', type: 'dim' });

  return lines;
}

// ── Completed extra-content renderers ─────────────────────────────────────

function FindingsTable({ findings }: { findings: LiveFinding[] }) {
  return (
    <div className="space-y-1.5">
      {findings.map(f => (
        <div key={f.finding_id} className="flex items-center gap-2 text-xs">
          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-400" />
          <span className="font-mono text-zinc-500 shrink-0 text-[10px] uppercase tracking-wide w-36 truncate">
            {f.pattern_type.replace(/_/g, ' ')}
          </span>
          <span className="text-zinc-700 flex-1 truncate">
            {f.accounts.length >= 2 ? `${f.accounts[0]} → ${f.accounts[1]}` : f.accounts[0] ?? '—'}
          </span>
          <span className="shrink-0 text-zinc-400 tabular-nums">{Math.round(f.confidence * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

function CasesTable({ cases }: { cases: LiveCase[] }) {
  return (
    <div className="space-y-1.5">
      {cases.map((c, i) => {
        const colors = severityColor(c.severity);
        return (
          <div key={c.case_id} className="flex items-center gap-2 text-xs">
            <span className="shrink-0 text-zinc-400 w-4 text-right font-medium">#{i + 1}</span>
            <span className="font-mono text-zinc-500 shrink-0">{c.case_id}</span>
            <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
              {c.severity}
            </span>
            <span className="font-semibold text-zinc-800 tabular-nums shrink-0">{c.risk_score}/100</span>
            <span className="text-zinc-400 shrink-0">{formatMoney(c.total_exposure)}</span>
            <span className="text-zinc-400 shrink-0">{c.accounts.length} accts</span>
          </div>
        );
      })}
    </div>
  );
}

function ActionsTable({ actions, cases }: { actions: LiveAction[]; cases?: LiveCase[] }) {
  const caseTitle = new Map(cases?.map(c => [c.case_id, c.title]) ?? []);
  return (
    <div className="space-y-1.5">
      {actions.map(a => (
        <div key={a.case_id} className="flex items-center gap-2 text-xs">
          <span className="font-mono text-zinc-500 shrink-0">{a.case_id}</span>
          <span className="text-zinc-700 flex-1 truncate">
            {caseTitle.get(a.case_id) ?? actionLabel(a.recommended_action)}
          </span>
          <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${urgencyBadge(a.urgency)}`}>
            {a.urgency}
          </span>
          <span className="shrink-0 text-zinc-500 font-medium">{actionLabel(a.recommended_action)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function AnalysisProgress({ runId, events, rowCount }: AnalysisProgressProps) {
  const engineStatus = deriveEngineStatus(events);
  const engineData = getEngineData(events);
  const metrics = engineData?.metrics ?? null;
  const highlights = engineData?.highlights;

  const a1 = deriveAgentState(1, events);
  const a2 = deriveAgentState(2, events);
  const a3 = deriveAgentState(3, events);
  const a4 = deriveAgentState(4, events);

  const isRunning = !events.some(e => e.type === 'run_completed' || e.type === 'run_failed');

  // Ticker lines — generated once per agent start, stable while running
  const a1Ticker = a1.status === 'running'
    ? <RunningTicker lines={agent1Lines(metrics, highlights?.topRelationships ?? [], highlights?.topComponents ?? [])} />
    : undefined;

  const a2Ticker = a2.status === 'running'
    ? <RunningTicker lines={agent2Lines(a1.findings ?? [])} />
    : undefined;

  const a3Ticker = a3.status === 'running'
    ? <RunningTicker lines={agent3Lines(a2.cases ?? [])} />
    : undefined;

  const a4Ticker = a4.status === 'running'
    ? <RunningTicker lines={agent4Lines(a2.cases ?? [], a3.actions ?? [])} />
    : undefined;

  // Completed extra content
  const a1Extra = a1.findings?.length
    ? <FindingsTable findings={a1.findings} />
    : undefined;

  const a2Extra = a2.cases?.length
    ? <CasesTable cases={a2.cases} />
    : undefined;

  const a3Extra = a3.actions?.length
    ? <ActionsTable actions={a3.actions} cases={a2.cases} />
    : undefined;

  const a4Extra = a4.status === 'completed'
    ? <p className="text-xs text-green-600 font-medium">Opening results dashboard…</p>
    : undefined;

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          {isRunning && <Loader className="w-4 h-4 text-blue-500 animate-spin" />}
          {!isRunning && <CheckCircle className="w-4 h-4 text-green-500" />}
          <h2 className="text-lg font-semibold text-zinc-900">
            {isRunning ? 'Analyzing transactions…' : 'Analysis complete'}
          </h2>
        </div>
        {rowCount != null && (
          <p className="text-sm text-zinc-500">{rowCount.toLocaleString()} rows loaded</p>
        )}
        {runId && (
          <p className="text-xs text-zinc-400 font-mono mt-1">Run: {runId}</p>
        )}
      </div>

      {/* Engine card */}
      <div className={`rounded-xl border p-4 mb-4 ${
        engineStatus === 'done'    ? 'bg-white border-green-200' :
        engineStatus === 'running' ? 'bg-zinc-900 border-zinc-700' :
        'bg-zinc-50 border-zinc-200 opacity-50'
      }`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {engineStatus === 'done'    && <CheckCircle className="w-5 h-5 text-green-500" />}
            {engineStatus === 'running' && <Loader className="w-5 h-5 text-emerald-400 animate-spin" />}
            {engineStatus === 'waiting' && <div className="w-5 h-5 rounded-full border-2 border-zinc-300" />}
          </div>
          <div className="flex-1">
            <div className={`font-semibold text-sm ${engineStatus === 'running' ? 'text-white' : 'text-zinc-900'}`}>
              Detection Engine
            </div>
            {engineStatus === 'done' && metrics ? (
              <div className="mt-1 text-xs text-zinc-600 space-y-0.5">
                <p>{metrics.row_count.toLocaleString()} rows processed</p>
                <p>{metrics.account_count.toLocaleString()} accounts · {metrics.internal_transfer_count.toLocaleString()} internal transfers</p>
                {metrics.date_range.start && (
                  <p className="text-zinc-400">{metrics.date_range.start.slice(0, 10)} → {metrics.date_range.end.slice(0, 10)}</p>
                )}
              </div>
            ) : (
              <p className={`text-xs mt-0.5 ${engineStatus === 'running' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {engineStatus === 'running' ? 'Parsing CSV and building account graph…' : 'Waiting'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Agent cards */}
      <div className="space-y-3">
        <AgentStepCard
          label="Agent 1 — Pattern Finder"
          subtitle="Identifying suspicious transaction patterns"
          status={a1.status}
          summary={a1.summary}
          cogneeWrite={a1.cogneeWrite}
          ticker={a1Ticker}
          extraContent={a1Extra}
        />
        <AgentStepCard
          label="Agent 2 — Case Ranker"
          subtitle="Grouping patterns into ranked fraud cases"
          status={a2.status}
          summary={a2.summary}
          cogneeRead={a2.cogneeRead}
          cogneeWrite={a2.cogneeWrite}
          cogneeReadLabel="Recalled Agent 1 from Cognee"
          ticker={a2Ticker}
          extraContent={a2Extra}
        />
        <AgentStepCard
          label="Agent 3 — Action Recommender"
          subtitle="Determining analyst response for each case"
          status={a3.status}
          summary={a3.summary}
          cogneeRead={a3.cogneeRead}
          cogneeWrite={a3.cogneeWrite}
          cogneeReadLabel="Recalled Agent 2 from Cognee"
          ticker={a3Ticker}
          extraContent={a3Extra}
        />
        <AgentStepCard
          label="Agent 4 — Report Writer"
          subtitle="Creating downloadable investigation reports"
          status={a4.status}
          summary={a4.summary}
          cogneeRead={a4.cogneeRead}
          cogneeWrite={a4.cogneeWrite}
          cogneeReadLabel="Recalled Agents 1–3 from Cognee"
          ticker={a4Ticker}
          extraContent={a4Extra}
        />
      </div>
    </div>
  );
}
