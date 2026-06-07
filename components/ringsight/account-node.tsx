'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { formatMoney } from '@/lib/ui/format';
import type { AccountNodeData } from '@/lib/ui/graph-layout';

const FLAG_SHORT: Record<string, string> = {
  HIGH_INTERNAL_TRANSFER_RATIO: 'Hi transfer ratio',
  NIGHT_ACTIVITY_CONCENTRATION: 'Night activity',
  STRUCTURED_AMOUNT_RANGE: 'Structured amounts',
  SINGLE_CATEGORY_CONCENTRATION: 'Single category',
  NEW_ACCOUNT_ACTIVITY: 'New account',
  LOW_DEVICE_REGION_VARIANCE: 'Low variance',
};

interface AccountNodeProps {
  data: AccountNodeData;
  selected: boolean;
}

export const AccountNode = memo(function AccountNode({ data, selected }: AccountNodeProps) {
  const { accountId, riskScore, riskLabel, isConnector, sentAmount, receivedAmount, flags } = data;

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
      style={{ minWidth: 160 }}
    >
      <Handle type="target" position={Position.Left} className="!bg-zinc-400 !w-2.5 !h-2.5" />

      {/* Account ID */}
      <div className="font-mono text-sm font-bold text-zinc-900 text-center">{accountId}</div>

      {/* Role badge */}
      <div className="flex justify-center mt-1 gap-1 flex-wrap">
        {isConnector && (
          <span className="text-[9px] font-semibold bg-zinc-800 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">
            Connector
          </span>
        )}
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${labelBg}`}>
          {riskLabel} · {riskScore}
        </span>
      </div>

      {/* Sent / Received */}
      <div className="flex justify-between mt-2 text-[10px] text-zinc-500">
        <span>↑ {formatMoney(sentAmount)}</span>
        <span>↓ {formatMoney(receivedAmount)}</span>
      </div>

      {/* Risk flags */}
      {flags.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {flags.slice(0, 3).map(f => (
            <div key={f} className="text-[9px] text-zinc-500 bg-white/70 rounded px-1.5 py-0.5 text-center truncate">
              {FLAG_SHORT[f] ?? f.replace(/_/g, ' ').toLowerCase()}
            </div>
          ))}
          {flags.length > 3 && (
            <div className="text-[9px] text-zinc-400 text-center">+{flags.length - 3} more</div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!bg-zinc-400 !w-2.5 !h-2.5" />
    </div>
  );
});
