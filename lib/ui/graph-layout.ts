import type { Node, Edge } from '@xyflow/react';
import type { RelationshipSignal, AccountSignal } from '@/lib/detection/types';
import type { RankedFraudCase } from '@/lib/agents/agent2/types';
import { formatMoney } from './format';

export interface AccountNodeData {
  accountId: string;
  riskScore: number;
  riskLabel: string;
  isConnector: boolean;
  transactionCount: number;
  sentAmount: number;
  receivedAmount: number;
  caseFlowAmount: number;
  totalTxns: number;
  internalSentCount: number;
  internalSentAmount: number;
  internalSentPct: number;
  uniqueInternalReceivers: number;
  nightTxnPct: number;
  amountBandPct: number;
  topMerchantCategory: string | null;
  topCategoryPct: number;
  deviceCount: number;
  ipRegionCount: number;
  accountAgeDaysAtFirstTxn: number;
  flags: string[];
  [key: string]: unknown;
}

export interface EdgeData {
  exposure: number;
  score: number;
  txnCount: number;
  flags: string[];
  nightPct: number;
  avgAmount: number;
  [key: string]: unknown;
}

const NODE_W = 240;
const NODE_H = 190;
const H_GAP = NODE_W + 140;  // horizontal gap between nodes in a chain
const V_GAP = NODE_H + 110;  // vertical gap for branches

/**
 * Build a directed graph layout.
 * - If the case has a chain (A → B → C), lay it out left-to-right.
 * - Otherwise use a wide circular layout so nodes have room.
 */
export function buildGraphElements(
  caseItem: RankedFraudCase,
  allAccounts: AccountSignal[],
  allRelationships: RelationshipSignal[],
): { nodes: Node<AccountNodeData>[]; edges: Edge<EdgeData>[] } {
  const accountSet = new Set(caseItem.accounts);
  const relSet = new Set(caseItem.relationship_ids);
  const connectorSet = new Set(caseItem.connector_accounts);

  const accountMap = new Map(allAccounts.map(a => [a.account_id, a]));
  const caseRelationships = allRelationships.filter(r => relSet.has(r.edge_id));

  // Per-account totals from relationships
  const sentMap = new Map<string, number>();
  const recvMap = new Map<string, number>();
  const countMap = new Map<string, number>();
  for (const rel of caseRelationships) {
    sentMap.set(rel.sender, (sentMap.get(rel.sender) ?? 0) + rel.total_exposure);
    recvMap.set(rel.receiver, (recvMap.get(rel.receiver) ?? 0) + rel.total_exposure);
    countMap.set(rel.sender, (countMap.get(rel.sender) ?? 0) + rel.transaction_count);
    countMap.set(rel.receiver, (countMap.get(rel.receiver) ?? 0) + rel.transaction_count);
  }

  const positions = computePositions(caseItem, caseRelationships);

  const accounts = Array.from(accountSet);
  const nodes: Node<AccountNodeData>[] = accounts.map(id => {
    const sig = accountMap.get(id);
    const sentAmount = sentMap.get(id) ?? 0;
    const receivedAmount = recvMap.get(id) ?? 0;
    return {
      id,
      type: 'accountNode',
      position: positions[id] ?? { x: 0, y: 0 },
      data: {
        accountId: id,
        riskScore: sig?.risk_score ?? 0,
        riskLabel: sig?.risk_label ?? 'Low',
        isConnector: connectorSet.has(id),
        transactionCount: countMap.get(id) ?? 0,
        sentAmount,
        receivedAmount,
        caseFlowAmount: sentAmount + receivedAmount,
        totalTxns: sig?.total_txns ?? 0,
        internalSentCount: sig?.internal_sent_count ?? 0,
        internalSentAmount: sig?.internal_sent_amount ?? sentAmount,
        internalSentPct: sig?.internal_sent_pct ?? 0,
        uniqueInternalReceivers: sig?.unique_internal_receivers ?? 0,
        nightTxnPct: sig?.night_txn_pct ?? 0,
        amountBandPct: sig?.amount_band_400_900_pct ?? 0,
        topMerchantCategory: sig?.top_merchant_category ?? null,
        topCategoryPct: sig?.top_category_pct ?? 0,
        deviceCount: sig?.device_count ?? 0,
        ipRegionCount: sig?.ip_region_count ?? 0,
        accountAgeDaysAtFirstTxn: sig?.account_age_days_at_first_txn ?? 0,
        flags: sig?.risk_flags ?? [],
      },
    };
  });

  const edges: Edge<EdgeData>[] = caseRelationships.map(rel => {
    const strokeWidth = rel.risk_score >= 85 ? 3 : rel.risk_score >= 65 ? 2 : 1.5;
    const stroke =
      rel.risk_score >= 85 ? '#ef4444' :
      rel.risk_score >= 65 ? '#f97316' :
      '#94a3b8';

    const flagLabels = rel.risk_flags.map(f => f.replace(/_/g, ' ').toLowerCase()).join(' · ');
    const label = [
      `${rel.transaction_count} txns · ${formatMoney(rel.total_exposure)}`,
      flagLabels ? `(${flagLabels})` : '',
    ].filter(Boolean).join('\n');

    return {
      id: rel.edge_id,
      source: rel.sender,
      target: rel.receiver,
      label,
      labelStyle: { fontSize: 10, fill: '#52525b' },
      labelBgStyle: { fill: '#fff', fillOpacity: 0.85 },
      labelBgPadding: [4, 3] as [number, number],
      style: { strokeWidth, stroke },
      markerEnd: { type: 'arrowclosed' as const },
      data: {
        exposure: rel.total_exposure,
        score: rel.risk_score,
        txnCount: rel.transaction_count,
        flags: rel.risk_flags,
        nightPct: rel.night_pct,
        avgAmount: rel.avg_amount,
      },
    };
  });

  return { nodes, edges };
}

function computePositions(
  caseItem: RankedFraudCase,
  rels: RelationshipSignal[],
): Record<string, { x: number; y: number }> {
  const accounts = caseItem.accounts;
  const n = accounts.length;
  const positions: Record<string, { x: number; y: number }> = {};

  // Build adjacency for topological sort
  const outEdges = new Map<string, string[]>();
  const inDegree = new Map<string, number>(accounts.map(a => [a, 0]));
  for (const rel of rels) {
    const targets = outEdges.get(rel.sender) ?? [];
    targets.push(rel.receiver);
    outEdges.set(rel.sender, targets);
    inDegree.set(rel.receiver, (inDegree.get(rel.receiver) ?? 0) + 1);
  }

  // Try to find the longest chain for left-to-right layout
  const chain = longestChain(caseItem.chains, accounts);

  if (chain.length >= 2) {
    // Place chain nodes left-to-right, centred vertically
    const totalW = (chain.length - 1) * H_GAP;
    const startX = -(totalW / 2);
    const midY = 0;
    chain.forEach((id, i) => {
      positions[id] = { x: startX + i * H_GAP, y: midY };
    });

    // Place non-chain accounts above/below the node they connect to
    let aboveOffset = 0;
    let belowOffset = 0;
    const chainSet = new Set(chain);
    for (const id of accounts) {
      if (chainSet.has(id)) continue;
      // find which chain node they connect to
      const anchor = findAnchor(id, chain, rels);
      const anchorPos = anchor ? positions[anchor] : { x: 0, y: 0 };
      if (aboveOffset % 2 === 0) {
        positions[id] = { x: anchorPos.x, y: anchorPos.y - V_GAP - aboveOffset * 20 };
        aboveOffset++;
      } else {
        positions[id] = { x: anchorPos.x, y: anchorPos.y + V_GAP + belowOffset * 20 };
        belowOffset++;
      }
    }
  } else {
    // Wide circular layout
    const RADIUS = Math.max(NODE_W + 120, n * 145);
    const CX = 0;
    const CY = 0;
    if (n === 1) {
      positions[accounts[0]] = { x: CX, y: CY };
    } else {
      accounts.forEach((id, i) => {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2;
        positions[id] = {
          x: CX + RADIUS * Math.cos(angle),
          y: CY + RADIUS * Math.sin(angle),
        };
      });
    }
  }

  return positions;
}

function longestChain(chains: string[][], accounts: string[]): string[] {
  if (!chains || chains.length === 0) return [];
  // Filter to chains whose nodes are all present in accounts
  const acctSet = new Set(accounts);
  const valid = chains.filter(c => c.every(id => acctSet.has(id)));
  if (valid.length === 0) return [];
  return valid.reduce((best, c) => c.length > best.length ? c : best, [] as string[]);
}

function findAnchor(nodeId: string, chain: string[], rels: RelationshipSignal[]): string | null {
  for (const rel of rels) {
    if (rel.sender === nodeId && chain.includes(rel.receiver)) return rel.receiver;
    if (rel.receiver === nodeId && chain.includes(rel.sender)) return rel.sender;
  }
  return chain[0] ?? null;
}
