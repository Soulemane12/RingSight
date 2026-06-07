'use client';

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from '@xyflow/react';
import { AccountNode } from './account-node';
import { buildGraphElements } from '@/lib/ui/graph-layout';
import type { RankedFraudCase } from '@/lib/agents/agent2/types';
import type { RelationshipSignal, AccountSignal } from '@/lib/detection/types';

const nodeTypes = { accountNode: AccountNode };

interface NetworkGraphProps {
  caseItem: RankedFraudCase;
  allAccounts: AccountSignal[];
  allRelationships: RelationshipSignal[];
  onEdgeClick?: (edgeId: string) => void;
}

export function NetworkGraph({
  caseItem,
  allAccounts,
  allRelationships,
  onEdgeClick,
}: NetworkGraphProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraphElements(caseItem, allAccounts, allRelationships),
    [caseItem, allAccounts, allRelationships],
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: { id: string }) => {
      onEdgeClick?.(edge.id);
    },
    [onEdgeClick],
  );

  return (
    <div className="w-full rounded-xl border border-zinc-200 overflow-hidden bg-zinc-50" style={{ height: 520 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeClick={handleEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.3}
        maxZoom={2.5}
        nodesDraggable
        elementsSelectable
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ animated: false }}
      >
        <Controls showInteractive={false} />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d4d4d8" />
      </ReactFlow>
    </div>
  );
}
