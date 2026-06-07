import { type NextRequest } from 'next/server';
import { runEngine } from '@/lib/detection/engine';
import { runPatternFinder } from '@/lib/agents/agent1/pattern-finder';
import { runCaseRankerAgent } from '@/lib/agents/agent2/case-ranker';
import { runActionRecommenderAgent } from '@/lib/agents/agent3/action-recommender';
import { runReportWriterAgent } from '@/lib/agents/agent4/report-writer';
import type { AnalysisEvent, FullAnalysisResult } from '@/lib/ui/types';

export const runtime = 'nodejs';

function enc(event: AnalysisEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(event) + '\n');
}

export async function POST(request: NextRequest): Promise<Response> {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: AnalysisEvent) => {
        try { controller.enqueue(enc(event)); } catch { /* stream closed */ }
      };

      let runId: string | undefined;

      try {
        const contentType = request.headers.get('content-type') ?? '';
        let csvText: string;

        if (contentType.includes('multipart/form-data')) {
          const formData = await request.formData();
          const file = formData.get('file');
          if (!file || typeof file === 'string') {
            emit({ type: 'run_failed', stage: 'upload', message: 'Missing file in form data' });
            controller.close();
            return;
          }
          csvText = await (file as File).text();
        } else {
          csvText = await request.text();
        }

        if (!csvText.trim()) {
          emit({ type: 'run_failed', stage: 'upload', message: 'File is empty' });
          controller.close();
          return;
        }

        // ── Engine ─────────────────────────────────────────────────────────
        let engineOutput;
        try {
          engineOutput = runEngine(csvText);
        } catch (err) {
          emit({ type: 'run_failed', stage: 'engine', message: err instanceof Error ? err.message : String(err) });
          controller.close();
          return;
        }

        runId = engineOutput.run_id;
        emit({ type: 'run_started', run_id: runId });

        const topRels = [...engineOutput.relationships]
          .sort((a, b) => b.risk_score - a.risk_score)
          .slice(0, 6)
          .map(r => ({
            edge_id: r.edge_id,
            sender: r.sender,
            receiver: r.receiver,
            txn_count: r.transaction_count,
            exposure: r.total_exposure,
            risk_score: r.risk_score,
            flags: r.risk_flags,
          }));

        const topComps = [...engineOutput.network_components]
          .sort((a, b) => b.risk_score - a.risk_score)
          .slice(0, 4)
          .map(c => ({
            component_id: c.component_id,
            accounts: c.accounts,
            risk_score: c.risk_score,
            has_chain: c.chains.length > 0,
          }));

        emit({
          type: 'engine_completed',
          run_id: runId,
          metrics: engineOutput.metrics,
          highlights: { topRelationships: topRels, topComponents: topComps },
        });

        // ── Agent 1 ────────────────────────────────────────────────────────
        emit({ type: 'agent_started', run_id: runId, agent: 1, label: 'Pattern Finder' });
        let agent1Output;
        try {
          agent1Output = await runPatternFinder(engineOutput);
        } catch (err) {
          emit({ type: 'run_failed', run_id: runId, stage: 'agent_1', message: err instanceof Error ? err.message : String(err) });
          controller.close();
          return;
        }
        emit({
          type: 'agent_completed',
          run_id: runId,
          agent: 1,
          summary: `Found ${agent1Output.findings.length} evidence-backed suspicious pattern${agent1Output.findings.length !== 1 ? 's' : ''}`,
          cognee_read: false,
          cognee_write: agent1Output.cognee_stored,
          findings: agent1Output.findings.map(f => ({
            finding_id: f.finding_id,
            pattern_type: f.pattern_type,
            title: f.title,
            accounts: f.accounts,
            confidence: f.confidence,
            exposure: f.exposure,
          })),
        });

        // ── Agent 2 ────────────────────────────────────────────────────────
        emit({ type: 'agent_started', run_id: runId, agent: 2, label: 'Case Ranker' });
        let agent2Output;
        try {
          agent2Output = await runCaseRankerAgent({ engineOutput, agent1Output });
        } catch (err) {
          emit({ type: 'run_failed', run_id: runId, stage: 'agent_2', message: err instanceof Error ? err.message : String(err) });
          controller.close();
          return;
        }
        emit({
          type: 'agent_completed',
          run_id: runId,
          agent: 2,
          summary: `Created ${agent2Output.cases.length} ranked fraud case${agent2Output.cases.length !== 1 ? 's' : ''}`,
          cognee_read: agent2Output.cognee.recalled_agent_1,
          cognee_write: agent2Output.cognee.stored_agent_2,
          cases: agent2Output.cases.map(c => ({
            case_id: c.case_id,
            title: c.title,
            risk_score: c.risk_score,
            severity: c.severity,
            total_exposure: c.total_exposure,
            accounts: c.accounts,
          })),
        });

        // ── Agent 3 ────────────────────────────────────────────────────────
        emit({ type: 'agent_started', run_id: runId, agent: 3, label: 'Action Recommender' });
        let agent3Output;
        try {
          agent3Output = await runActionRecommenderAgent({ engineOutput, agent1Output, agent2Output });
        } catch (err) {
          emit({ type: 'run_failed', run_id: runId, stage: 'agent_3', message: err instanceof Error ? err.message : String(err) });
          controller.close();
          return;
        }
        emit({
          type: 'agent_completed',
          run_id: runId,
          agent: 3,
          summary: `Created ${agent3Output.actions.length} action plan${agent3Output.actions.length !== 1 ? 's' : ''}`,
          cognee_read: agent3Output.cognee.recalled_agent_2,
          cognee_write: agent3Output.cognee.stored_agent_3,
          actions: agent3Output.actions.map(a => ({
            case_id: a.case_id,
            recommended_action: a.recommended_action,
            urgency: a.urgency,
          })),
        });

        // ── Agent 4 ────────────────────────────────────────────────────────
        emit({ type: 'agent_started', run_id: runId, agent: 4, label: 'Report Writer' });
        let agent4Output;
        try {
          agent4Output = await runReportWriterAgent({ agent1Output, agent2Output, agent3Output });
        } catch (err) {
          emit({ type: 'run_failed', run_id: runId, stage: 'agent_4', message: err instanceof Error ? err.message : String(err) });
          controller.close();
          return;
        }
        emit({
          type: 'agent_completed',
          run_id: runId,
          agent: 4,
          summary: `Generated ${agent4Output.reports.length} investigation report${agent4Output.reports.length !== 1 ? 's' : ''}`,
          cognee_read: agent4Output.cognee.recalled_agent_1 && agent4Output.cognee.recalled_agent_2 && agent4Output.cognee.recalled_agent_3,
          cognee_write: agent4Output.cognee.stored_agent_4,
        });

        // ── Final cross-run consistency validation ─────────────────────────
        // Ensure all agents share the same run_id
        if (
          agent1Output.run_id !== runId ||
          agent2Output.run_id !== runId ||
          agent3Output.run_id !== runId ||
          agent4Output.run_id !== runId
        ) {
          emit({ type: 'run_failed', run_id: runId, stage: 'validation', message: 'Run ID mismatch across agents — stale output detected' });
          controller.close();
          return;
        }

        // Force Agent 2 / Agent 3 values onto each report (never trust model-generated scores)
        for (const report of agent4Output.reports) {
          const caseItem = agent2Output.cases.find(c => c.case_id === report.case_id);
          const action = agent3Output.actions.find(a => a.case_id === report.case_id);
          if (!caseItem || !action) {
            emit({ type: 'run_failed', run_id: runId, stage: 'validation', message: `Broken report chain for ${report.case_id}` });
            controller.close();
            return;
          }
          report.risk_score = caseItem.risk_score;
          report.severity = caseItem.severity;
          report.total_exposure = caseItem.total_exposure;
          report.accounts = caseItem.accounts;
          report.recommended_action = action.recommended_action;
          report.urgency = action.urgency;
        }

        const result: FullAnalysisResult = {
          engine: engineOutput,
          agent1: agent1Output,
          agent2: agent2Output,
          agent3: agent3Output,
          agent4: agent4Output,
        };

        emit({ type: 'run_completed', run_id: runId, result });
      } catch (err) {
        emit({
          type: 'run_failed',
          run_id: runId,
          stage: 'unknown',
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
