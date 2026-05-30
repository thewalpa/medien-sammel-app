import React, { useCallback, useState } from 'react';
import type { Node, Position, AppMode } from '../types';
import { MEDIA_TYPE_EMOJI } from '../data/themes';

interface CanvasNodeProps {
  node: Node;
  selected: boolean;
  connecting: boolean;
  mode: AppMode;
  zoom: number;
  onSelect: (id: string) => void;
  onMove: (id: string, position: Position) => void;
  onStartConnect: (id: string) => void;
  onFinishConnect: (id: string) => void;
}

export default function CanvasNode({
  node,
  selected,
  connecting,
  mode,
  zoom,
  onSelect,
  onMove,
  onStartConnect,
  onFinishConnect,
}: CanvasNodeProps) {
  const [imgError, setImgError] = useState(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();

      if (mode === 'connect') {
        onFinishConnect?.(node.id);
        return;
      }

      onSelect?.(node.id);

      const startX = e.clientX;
      const startY = e.clientY;
      const startPos = { ...node.position };
      const currentZoom = zoom || 1;
      let moved = false;

      const onPointerMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
        if (moved) {
          onMove?.(node.id, {
            x: startPos.x + dx / currentZoom,
            y: startPos.y + dy / currentZoom,
          });
        }
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [node.id, node.position, mode, zoom, onSelect, onMove, onFinishConnect]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onStartConnect?.(node.id);
    },
    [node.id, onStartConnect]
  );

  const emoji = MEDIA_TYPE_EMOJI[node.type] || '📌';

  return (
    <div
      className={
        'canvas-node' + (selected ? ' selected' : '') + (connecting ? ' connecting' : '')
      }
      style={{
        left: node.position.x,
        top: node.position.y,
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
    >
      <div className="node-card">
        {node.imageUrl && !imgError ? (
          <img
            className="node-image"
            src={node.imageUrl}
            alt={node.title}
            loading="lazy"
            onError={() => setImgError(true)}
            draggable={false}
          />
        ) : (
          <div className="node-image-placeholder">{emoji}</div>
        )}
        <div className="node-info">
          <div className="node-title">{node.title}</div>
          <div className="node-subtitle">
            {node.subtitle
              ? node.data.year && !node.subtitle.includes(String(node.data.year))
                ? `${node.subtitle} · ${node.data.year}`
                : node.subtitle
              : node.data.year || ''}
          </div>
          <span className={'node-type-badge ' + node.type}>{node.type}</span>
        </div>
      </div>
    </div>
  );
}
