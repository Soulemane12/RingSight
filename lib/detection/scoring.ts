import type { RelationshipSignal, NetworkComponent, AccountSignal, RiskLabel } from './types';

export function labelFromScore(score: number): RiskLabel {
  if (score >= 85) return 'Critical';
  if (score >= 65) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

export function scoreRelationship(
  rel: Omit<RelationshipSignal, 'risk_score' | 'risk_label'>,
  senderAccount: AccountSignal | undefined,
): { risk_score: number; risk_label: RiskLabel } {
  let score = 0;

  if (rel.risk_flags.includes('REPEATED_EDGE'))           score += 20;
  if (rel.risk_flags.includes('NIGHT_TRANSFER_PATTERN'))  score += 20;
  if (rel.risk_flags.includes('STRUCTURED_SMALL_AMOUNTS')) score += 20;
  if (rel.risk_flags.includes('SIX_DAY_CADENCE'))         score += 15;
  if (rel.risk_flags.includes('CATEGORY_LOCKED'))         score += 10;
  if (rel.risk_flags.includes('HIGH_EDGE_EXPOSURE'))      score += 10;
  if (senderAccount?.risk_flags.includes('LOW_DEVICE_REGION_VARIANCE')) score += 5;

  const risk_score = Math.min(100, score);
  return { risk_score, risk_label: labelFromScore(risk_score) };
}

export function scoreComponent(
  component: Omit<NetworkComponent, 'risk_score' | 'risk_label'>,
  componentRelationships: RelationshipSignal[],
): { risk_score: number; risk_label: RiskLabel } {
  const n = componentRelationships.length;
  const base = n > 0
    ? componentRelationships.reduce((s, r) => s + r.risk_score, 0) / n
    : 0;

  let score = base;

  if (component.accounts.length >= 3) score += 5;

  const suspiciousEdges = componentRelationships.filter(r => r.risk_score >= 65);
  if (suspiciousEdges.length >= 2) score += 5;

  if (component.chains.length > 0) score += 5;

  const totalExposure = componentRelationships.reduce((s, r) => s + r.total_exposure, 0);
  if (totalExposure > 50_000) score += 5;

  const risk_score = Math.min(100, Math.round(score));
  return { risk_score, risk_label: labelFromScore(risk_score) };
}
