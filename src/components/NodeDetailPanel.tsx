import React from 'react';
import type { Node } from '../types';
import { MEDIA_TYPE_EMOJI } from '../data/themes';

interface NodeDetailPanelProps {
  node: Node | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onStartConnect: (id: string) => void;
}

export default function NodeDetailPanel({
  node,
  onClose,
  onDelete,
  onStartConnect,
}: NodeDetailPanelProps) {
  if (!node) return null;

  const emoji = MEDIA_TYPE_EMOJI[node.type] || '📌';

  return (
    <div className="detail-panel" id="detail-panel">
      <div className="modal-handle" />
      <div className="detail-panel-content">
        <div className="detail-panel-header">
          {node.imageUrl ? (
            <img className="detail-panel-image" src={node.imageUrl} alt={node.title} />
          ) : (
            <div
              className="detail-panel-image"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-surface-hover)',
                fontSize: '36px',
              }}
            >
              {emoji}
            </div>
          )}
          <div className="detail-panel-meta">
            <div className="detail-panel-title">{node.title}</div>
            {node.subtitle && <div className="detail-panel-subtitle">{node.subtitle}</div>}
            <span className={'node-type-badge ' + node.type} style={{ marginTop: '8px' }}>
              {emoji} {node.type}
            </span>
          </div>
          <button className="modal-close" onClick={onClose} id="detail-close">
            ✕
          </button>
        </div>

        {node.data?.source && node.data.source !== 'manual' && (
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
            Source: {node.data.source}
            {node.data.year && ' · ' + node.data.year}
          </div>
        )}

        <div className="detail-panel-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              onStartConnect?.(node.id);
              onClose?.();
            }}
            id="detail-connect"
          >
            🔗 Connect
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              onDelete?.(node.id);
              onClose?.();
            }}
            id="detail-delete"
          >
            🗑 Delete
          </button>
        </div>
      </div>
    </div>
  );
}
