'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { formatMoney, formatPct } from '@/lib/ui/format';
import type { AccountNodeData } from '@/lib/ui/graph-layout';

const FLAG_LABEL: Record<string, string> = {
  HIGH_INTERNAL_TRANSFER_RATIO: 'Internal transfers',
  NIGHT_ACTIVITY_CONCENTRATION: 'Night activity',
  STRUCTURED_AMOUNT_RANGE: 'Structured band',
  SINGLE_CATEGORY_CONCENTRATION: 'Category concentration',
  NEW_ACCOUNT_ACTIVITY: 'New account',
  LOW_DEVICE_REGION_VARIANCE: 'Low device/IP variance',
};

interface AccountNodeProps {
  data: AccountNodeData;
  selected: boolean;
}

export const AccountNode = memo(function AccountNode({ data, selected }: AccountNodeProps) {
  const {
    accountId,
    riskScore = 0,
    riskLabel = 'Low',
    isConnector = false,
    transactionCount = 0,
    sentAmount = 0,
    receivedAmount = 0,
    caseFlowAmount = 0,
    totalTxns = 0,
    internalSentAmount = 0,
    internalSentPct = 0,
    nightTxnPct = 0,
    amountBandPct = 0,
    deviceCount = 0,
    ipRegionCount = 0,
    flags = [],
  } = data;

  const borderColor =
    riskScore >= 85 ? 'border-red-500' :
    riskScore >= 65 ? 'border-orange-400' :
    riskScore >= 40 ? 'border-yellow-400' :
    'border-zinc-300';

  const bgColor =
    riskScore >= 85 ? 'bg-red-50' :
    riskScore >= 65 ? 'bg-orange-50' :
    riskScore >= 40 ? 'bg-yellow-50' :
    'bg-white';

  const scoreColor =
    riskScore >= 85 ? 'text-red-600' :
    riskScore >= 65 ? 'text-orange-600' :
    riskScore >= 40 ? 'text-yellow-600' :
    'text-zinc-500';

  const labelBg =
    riskScore >= 85 ? 'bg-red-100 text-red-700' :
    riskScore >= 65 ? 'bg-orange-100 text-orange-700' :
    riskScore >= 40 ? 'bg-yellow-100 text-yellow-700' :
    'bg-zinc-100 text-zinc-500';

  return (
    <div
      className={`
        rounded-xl border-2 ${borderColor} ${bgColor} px-4 py-3 shadow-md
        ${selected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
        ${isConnector ? 'ring-2 ring-zinc-800 ring-offset-1' : ''}
      `}
      style={{ width: 240, minHeight: 190 }}
    >
      <Handle type="target" position={Position.Left} className="!bg-zinc-400 !w-2.5 !h-2.5" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-mono text-sm font-bold text-zinc-900">{accountId}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {isConnector && (
              <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                Connector
              </span>
            )}
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${labelBg}`}>
              {riskLabel}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`font-mono text-xl font-bold leading-none ${scoreColor}`}>
            {riskScore}
          </div>
          <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-400">
            /100 risk
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <NodeMetric label="Sent" value={formatMoney(sentAmount)} />
        <NodeMetric label="Received" value={formatMoney(receivedAmount)} />
        <NodeMetric label="Internal sent" value={formatMoney(internalSentAmount)} />
        <NodeMetric label="Case flow" value={formatMoney(caseFlowAmount)} />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1 text-center">
        <NodeMiniMetric label="Txns" value={`${transactionCount}/${totalTxns}`} />
        <NodeMiniMetric label="Night" value={formatPct(nightTxnPct)} />
        <NodeMiniMetric label="$400-900" value={formatPct(amountBandPct)} />
      </div>

      {flags.length > 0 && (
        <div className="mt-2 space-y-1">
          {flags.slice(0, 4).map(f => (
            <div key={f} className="rounded bg-white/75 px-1.5 py-1 text-[9px] leading-tight text-zinc-600">
              <span className="font-semibold text-zinc-700">{FLAG_LABEL[f] ?? formatFlagName(f)}:</span>{' '}
              <span>{flagDetail(f, data)}</span>
            </div>
          ))}
          {flags.length > 4 && (
            <div className="text-center text-[9px] text-zinc-400">+{flags.length - 4} more flags</div>
          )}
        </div>
      )}

      <div className="mt-2 truncate text-[9px] text-zinc-500">
        {formatPct(internalSentPct)} internal out · {deviceCount} device{deviceCount === 1 ? '' : 's'} · {ipRegionCount} region{ipRegionCount === 1 ? '' : 's'}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-zinc-400 !w-2.5 !h-2.5" />
    </div>
  );
});

function NodeMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white/80 px-2 py-1">
      <div className="text-[9px] font-medium uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="truncate font-mono text-[11px] font-semibold text-zinc-800">{value}</div>
    </div>
  );
}

function NodeMiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white/55 px-1 py-0.5">
      <div className="truncate font-mono text-[10px] font-semibold text-zinc-700">{value}</div>
      <div className="truncate text-[8px] font-medium uppercase tracking-wide text-zinc-400">{label}</div>
    </div>
  );
}

function formatFlagName(flag: string): string {
  return flag
    .split('_')
    .map(part => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

function flagDetail(flag: string, data: AccountNodeData): string {
  switch (flag) {
    case 'HIGH_INTERNAL_TRANSFER_RATIO':
      return `${formatPct(data.internalSentPct ?? 0)} outbound across ${data.internalSentCount ?? 0} transfers`;
    case 'NIGHT_ACTIVITY_CONCENTRATION':
      return `${formatPct(data.nightTxnPct ?? 0)} of transactions at night`;
    case 'STRUCTURED_AMOUNT_RANGE':
      return `${formatPct(data.amountBandPct ?? 0)} in the $400-$900 band`;
    case 'SINGLE_CATEGORY_CONCENTRATION':
      return `${data.topMerchantCategory ?? 'Top category'} at ${formatPct(data.topCategoryPct ?? 0)}`;
    case 'NEW_ACCOUNT_ACTIVITY':
      return `${data.accountAgeDaysAtFirstTxn ?? 0}d old at first transaction`;
    case 'LOW_DEVICE_REGION_VARIANCE':
      return `${data.deviceCount ?? 0} device${data.deviceCount === 1 ? '' : 's'}, ${data.ipRegionCount ?? 0} region${data.ipRegionCount === 1 ? '' : 's'}`;
    default:
      return `${data.riskScore}/100 account risk`;
  }
}
