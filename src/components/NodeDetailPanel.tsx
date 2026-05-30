import React, { useState, useEffect } from 'react';
import type { Node } from '../types';
import { MEDIA_TYPE_EMOJI } from '../data/themes';
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss';

interface NodeDetailPanelProps {
  node: Node | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onStartConnect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Node>) => void;
}

export default function NodeDetailPanel({
  node,
  onClose,
  onDelete,
  onStartConnect,
  onUpdate,
}: NodeDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editYear, setEditYear] = useState('');

  const { ref, handlers } = useSwipeToDismiss<HTMLDivElement>({
    direction: 'down',
    threshold: 60,
    onDismiss: onClose,
  });

  useEffect(() => {
    if (node) {
      setEditTitle(node.title || '');
      setEditSubtitle(node.subtitle || '');
      setEditYear(node.data?.year ? String(node.data.year) : '');
      setIsEditing(false);
    }
  }, [node]);

  if (!node) return null;

  const emoji = MEDIA_TYPE_EMOJI[node.type] || '📌';

  const handleSave = () => {
    if (!editTitle.trim() || !editYear.trim()) return;
    const yearParsed = parseInt(editYear.trim(), 10);
    if (isNaN(yearParsed)) return;

    onUpdate(node.id, {
      title: editTitle.trim(),
      subtitle: editSubtitle.trim(),
      data: {
        ...node.data,
        year: yearParsed,
      },
    });
    setIsEditing(false);
  };

  return (
    <div ref={ref} className="detail-panel" id="detail-panel" {...handlers}>
      <div className="modal-handle" />
      <div className="detail-panel-content">
        {isEditing ? (
          <div className="detail-panel-edit-form" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div className="modal-header" style={{ padding: '0 0 var(--space-sm) 0' }}>
              <span className="modal-title">Edit Details</span>
              <button className="modal-close" onClick={() => setIsEditing(false)}>✕</button>
            </div>
            
            <div>
              <label className="label" htmlFor="edit-title">Title</label>
              <input
                id="edit-title"
                className="input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Title"
              />
            </div>

            <div>
              <label className="label" htmlFor="edit-subtitle">Subtitle</label>
              <input
                id="edit-subtitle"
                className="input"
                value={editSubtitle}
                onChange={(e) => setEditSubtitle(e.target.value)}
                placeholder="Subtitle (artist, author, description, etc.)"
              />
            </div>

            <div>
              <label className="label" htmlFor="edit-year">Year (Required)</label>
              <input
                id="edit-year"
                className="input"
                type="number"
                value={editYear}
                onChange={(e) => setEditYear(e.target.value)}
                placeholder="Year"
                min="1000"
                max="2100"
              />
            </div>

            <div className="detail-panel-actions" style={{ marginTop: 'var(--space-md)' }}>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={!editTitle.trim() || !editYear.trim() || isNaN(parseInt(editYear, 10))}
                id="detail-edit-save"
              >
                Save
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setIsEditing(false)}
                id="detail-edit-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
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

            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
              {node.data?.source && `Source: ${node.data.source} · `}
              Year: {node.data?.year || 'Unknown'}
            </div>

            <div className="detail-panel-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setIsEditing(true)}
                id="detail-edit"
              >
                ✏️ Edit
              </button>
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
          </>
        )}
      </div>
    </div>
  );
}
