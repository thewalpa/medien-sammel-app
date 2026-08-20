import React, { memo } from 'react';
import type { Edge, Position } from '../types';
import { getEdgePath } from './canvasUtils';

/** Distance in canvas px from the edge stroke to the centre of the label */
const LABEL_OFFSET = 12;

interface CanvasEdgeProps {
  edge: Edge;
  fromPos: Position;
  toPos: Position;
  selected: boolean;
  onSelect: (id: string) => void;
}

function CanvasEdge({ edge, fromPos, toPos, selected, onSelect }: CanvasEdgeProps) {
  const { path, midpoint, normal } = getEdgePath(fromPos, toPos);
  const hasNote = Boolean(edge.note && edge.note.trim());

  // Nudge the label off the stroke, perpendicular to the edge so it clears the
  // line at any angle rather than only on horizontal edges.
  const labelPos = {
    x: midpoint.x + normal.x * LABEL_OFFSET,
    y: midpoint.y + normal.y * LABEL_OFFSET,
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(edge.id);
  };

  return (
    <g>
      {/* Invisible fat stroke for easier tapping */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
        onClick={handleSelect}
      />
      <path
        d={path}
        className={'edge-path' + (selected ? ' selected' : '') + (hasNote ? ' has-note' : '')}
        onClick={handleSelect}
      />
      {edge.label && (
        <text
          className="edge-label"
          x={labelPos.x}
          y={labelPos.y}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ pointerEvents: 'none' }}
        >
          {edge.label}
        </text>
      )}
    </g>
  );
}

export default memo(CanvasEdge);
