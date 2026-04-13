import React from 'react';
import type { Edge, Node } from '../types';
import { MEDIA_TYPE_EMOJI } from '../data/themes';
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss';

interface EdgeDetailModalProps {
  edge: Edge | null;
  sourceNode: Node | null;
  targetNode: Node | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

const NodeMiniPreview = ({ node }: { node: Node }) => {
  const emoji = MEDIA_TYPE_EMOJI[node.type] || '📌';
  return (
    <div className="edge-detail-node">
      {node.imageUrl ? (
        <img className="edge-detail-node-img" src={node.imageUrl} alt={node.title} />
      ) : (
        <div className="edge-detail-node-placeholder">{emoji}</div>
      )}
      <div className="edge-detail-node-title">{node.title}</div>
      <div className="edge-detail-node-subtitle">{node.subtitle}</div>
    </div>
  );
};

export default function EdgeDetailModal({
  edge,
  sourceNode,
  targetNode,
  onClose,
  onDelete,
}: EdgeDetailModalProps) {
  const { ref, handlers } = useSwipeToDismiss<HTMLDivElement>({
    direction: 'down',
    threshold: 60,
    onDismiss: onClose,
  });

  if (!edge || !sourceNode || !targetNode) return null;

  return (
    <div ref={ref} className="detail-panel edge-detail" id="edge-detail-panel" {...handlers}>
      <div className="modal-handle" />
      <div className="detail-panel-content">
        <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <span className="modal-title">Connection</span>
          <button className="modal-close" onClick={onClose} id="edge-detail-close">
            ✕
          </button>
        </div>

        <div className="edge-detail-visual">
          <NodeMiniPreview node={sourceNode} />
          <div className="edge-detail-arrow">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
            {edge.label && <div className="edge-detail-label">{edge.label}</div>}
          </div>
          <NodeMiniPreview node={targetNode} />
        </div>

        <div className="detail-panel-actions">
          <button
            className="btn btn-danger btn-block"
            onClick={() => {
              onDelete(edge.id);
              onClose();
            }}
            id="edge-detail-delete"
          >
            🗑 Delete Connection
          </button>
        </div>
      </div>
    </div>
  );
}
