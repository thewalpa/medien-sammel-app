import React from 'react';
import type { Edge, Position } from '../types';
import { getEdgePath } from './canvasUtils';

interface CanvasEdgeProps {
  edge: Edge;
  fromPos: Position;
  toPos: Position;
  selected: boolean;
  onSelect: (id: string) => void;
}

export default function CanvasEdge({ edge, fromPos, toPos, selected, onSelect }: CanvasEdgeProps) {
  const { path } = getEdgePath(fromPos, toPos);

  return (
    <g>
      {/* Invisible fat stroke for easier tapping */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(edge.id);
        }}
      />
      <path
        d={path}
        className={'edge-path' + (selected ? ' selected' : '')}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(edge.id);
        }}
      />
      {edge.label &&
        (() => {
          const { midpoint } = getEdgePath(fromPos, toPos);
          return (
            <text
              x={midpoint.x}
              y={midpoint.y - 8}
              textAnchor="middle"
              fontSize={10}
              fill="var(--text-secondary)"
              fontFamily="var(--font-family)"
              style={{ pointerEvents: 'none' }}
            >
              {edge.label}
            </text>
          );
        })()}
    </g>
  );
}
