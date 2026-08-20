import React, { memo, useMemo } from 'react';
import type { Edge, Node, Position } from '../types';
import CanvasEdge from './CanvasEdge';

interface EdgeLayerProps {
  edges: Edge[];
  nodes: Node[];
  selectedEdgeId: string | null;
  onSelectEdge: (id: string) => void;
  connectingLine: { from: Position; to: Position } | null;
}

function EdgeLayer({
  edges,
  nodes,
  selectedEdgeId,
  onSelectEdge,
  connectingLine,
}: EdgeLayerProps) {
  // Rebuild only when the node list actually changes, not on every parent render
  const nodeMap = useMemo(() => {
    const map: Record<string, Position> = {};
    nodes.forEach((n) => {
      map[n.id] = n.position;
    });
    return map;
  }, [nodes]);

  return (
    <svg
      className="edge-layer"
      width="10000"
      height="10000"
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      {edges.map((edge) => {
        const fromPos = nodeMap[edge.source];
        const toPos = nodeMap[edge.target];
        if (!fromPos || !toPos) return null;
        return (
          <CanvasEdge
            key={edge.id}
            edge={edge}
            fromPos={fromPos}
            toPos={toPos}
            selected={selectedEdgeId === edge.id}
            onSelect={onSelectEdge}
          />
        );
      })}
      {connectingLine && (
        <path
          d={
            'M ' +
            connectingLine.from.x +
            ' ' +
            connectingLine.from.y +
            ' L ' +
            connectingLine.to.x +
            ' ' +
            connectingLine.to.y
          }
          className="edge-path connecting"
        />
      )}
    </svg>
  );
}

export default memo(EdgeLayer);
