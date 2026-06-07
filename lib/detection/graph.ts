import type { RelationshipSignal, AccountSignal, NetworkComponent } from './types';

// Union-Find for weakly connected components (ignores edge direction)
class UnionFind {
  private parent: Map<string, string>;

  constructor(nodes: string[]) {
    this.parent = new Map(nodes.map(n => [n, n]));
  }

  find(x: string): string {
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!));
    }
    return this.parent.get(x)!;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }

  groups(): Map<string, string[]> {
    const result = new Map<string, string[]>();
    for (const node of this.parent.keys()) {
      const root = this.find(node);
      const group = result.get(root);
      if (group) group.push(node);
      else result.set(root, [node]);
    }
    return result;
  }
}

function findChains(
  accountSet: Set<string>,
  edges: RelationshipSignal[],
): string[][] {
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  const outNeighbor = new Map<string, string>();

  for (const acc of accountSet) {
    inDegree.set(acc, 0);
    outDegree.set(acc, 0);
  }
  for (const edge of edges) {
    outDegree.set(edge.sender, (outDegree.get(edge.sender) ?? 0) + 1);
    inDegree.set(edge.receiver, (inDegree.get(edge.receiver) ?? 0) + 1);
    outNeighbor.set(edge.sender, edge.receiver);
  }

  const chains: string[][] = [];
  for (const acc of accountSet) {
    if (inDegree.get(acc) === 0 && outDegree.get(acc) === 1) {
      const chain: string[] = [acc];
      const visited = new Set<string>([acc]);
      let current = acc;
      while (true) {
        const next = outNeighbor.get(current);
        if (!next || visited.has(next)) break;
        chain.push(next);
        visited.add(next);
        if (outDegree.get(next) !== 1) break;
        current = next;
      }
      if (chain.length >= 3) chains.push(chain);
    }
  }

  return chains;
}

function findCycles(
  accountSet: Set<string>,
  edges: RelationshipSignal[],
): string[][] {
  if (accountSet.size > 50) return [];

  const adj = new Map<string, string[]>();
  for (const acc of accountSet) adj.set(acc, []);
  for (const edge of edges) {
    adj.get(edge.sender)?.push(edge.receiver);
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    for (const neighbor of adj.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recursionStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart);
          const minIdx = cycle.indexOf([...cycle].sort()[0]);
          const normalized = [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
          const key = normalized.join(',');
          if (!cycles.some(c => c.join(',') === key)) {
            cycles.push(normalized);
          }
        }
      }
    }

    path.pop();
    recursionStack.delete(node);
  }

  for (const acc of accountSet) {
    if (!visited.has(acc)) dfs(acc);
  }

  return cycles;
}

export function buildNetworkComponents(
  relationships: RelationshipSignal[],
  _accountSignals: Map<string, AccountSignal>,
): Omit<NetworkComponent, 'risk_score' | 'risk_label'>[] {
  if (relationships.length === 0) return [];

  // Collect all unique account nodes
  const allNodes = new Set<string>();
  for (const rel of relationships) {
    allNodes.add(rel.sender);
    allNodes.add(rel.receiver);
  }

  // Weakly connected components via union-find (direction-agnostic)
  const uf = new UnionFind([...allNodes]);
  for (const rel of relationships) {
    uf.union(rel.sender, rel.receiver);
  }

  const groups = uf.groups(); // root → member list

  const components: Omit<NetworkComponent, 'risk_score' | 'risk_label'>[] = [];

  let idx = 0;
  for (const accountList of groups.values()) {
    const accountSet = new Set(accountList);

    const compEdges = relationships.filter(
      r => accountSet.has(r.sender) && accountSet.has(r.receiver),
    );

    // Skip singletons with no edges
    if (compEdges.length === 0) continue;

    const transaction_count = compEdges.reduce((s, r) => s + r.transaction_count, 0);
    const total_exposure = compEdges.reduce((s, r) => s + r.total_exposure, 0);
    const avg_edge_score =
      compEdges.reduce((s, r) => s + r.risk_score, 0) / compEdges.length;

    const edgeParticipation = new Map<string, number>();
    for (const edge of compEdges) {
      edgeParticipation.set(edge.sender, (edgeParticipation.get(edge.sender) ?? 0) + 1);
      edgeParticipation.set(edge.receiver, (edgeParticipation.get(edge.receiver) ?? 0) + 1);
    }
    const hub_accounts = [...edgeParticipation.entries()]
      .filter(([, count]) => count > 1)
      .map(([acc]) => acc);

    const chains = findChains(accountSet, compEdges);
    const cycles = findCycles(accountSet, compEdges);

    components.push({
      component_id: `COMP-${String(++idx).padStart(4, '0')}`,
      accounts: accountList.sort(),
      edge_count: compEdges.length,
      transaction_count,
      total_exposure: Math.round(total_exposure * 100) / 100,
      avg_edge_score: Math.round(avg_edge_score * 100) / 100,
      hub_accounts,
      chains,
      cycles,
    });
  }

  // Sort highest-exposure first, then re-assign stable IDs
  components.sort((a, b) => b.total_exposure - a.total_exposure);

  return components.map((comp, i) => ({
    ...comp,
    component_id: `COMP-${String(i + 1).padStart(4, '0')}`,
  }));
}
