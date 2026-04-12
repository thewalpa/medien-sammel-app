import React from 'react';
import type { Edge, Node, Position } from '../types';
import CanvasEdge from './CanvasEdge';

interface EdgeLayerProps {
  edges: Edge[];
  nodes: Node[];
  selectedEdgeId: string | null;
  onSelectEdge: (id: string) => void;
  connectingLine: { from: Position; to: Position } | null;
}

export default function EdgeLayer({
  edges,
  nodes,
  selectedEdgeId,
  onSelectEdge,
  connectingLine,
}: EdgeLayerProps) {
  const nodeMap: Record<string, Position> = {};
  nodes.forEach((n) => {
    nodeMap[n.id] = n.position;
  });

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
