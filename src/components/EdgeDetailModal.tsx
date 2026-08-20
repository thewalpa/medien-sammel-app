import React, { useState, useEffect } from 'react';
import type { Edge, Node } from '../types';
import { MEDIA_TYPE_EMOJI } from '../data/themes';
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss';

interface EdgeDetailModalProps {
  edge: Edge | null;
  sourceNode: Node | null;
  targetNode: Node | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Edge>) => void;
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

function formatNoteDate(iso: string | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function EdgeDetailModal({
  edge,
  sourceNode,
  targetNode,
  onClose,
  onDelete,
  onUpdate,
}: EdgeDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState('');
  const [editNote, setEditNote] = useState('');

  const { ref, handlers } = useSwipeToDismiss<HTMLDivElement>({
    direction: 'down',
    threshold: 60,
    onDismiss: onClose,
  });

  useEffect(() => {
    if (edge) {
      setEditLabel(edge.label || '');
      setEditNote(edge.note || '');
      setIsEditing(false);
    }
  }, [edge?.id]);

  if (!edge || !sourceNode || !targetNode) return null;

  const handleSave = () => {
    const label = editLabel.trim();
    const note = editNote.trim();
    const noteChanged = note !== (edge.note || '').trim();

    onUpdate(edge.id, {
      label,
      note,
      // Only bump the timestamp when the note text itself changed
      noteUpdatedAt: noteChanged
        ? note
          ? new Date().toISOString()
          : undefined
        : edge.noteUpdatedAt,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditLabel(edge.label || '');
    setEditNote(edge.note || '');
    setIsEditing(false);
  };

  const note = (edge.note || '').trim();

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

        {isEditing ? (
          <div className="edge-detail-note-form">
            <div>
              <label className="label" htmlFor="edge-edit-label">
                Label
              </label>
              <input
                id="edge-edit-label"
                className="input"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="Short label (e.g. inspired by)"
                maxLength={40}
              />
            </div>

            <div>
              <label className="label" htmlFor="edge-edit-note">
                Note
              </label>
              <textarea
                id="edge-edit-note"
                className="input edge-detail-note-input"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Why are these connected? Add your thoughts…"
                rows={5}
              />
            </div>

            <div className="detail-panel-actions">
              <button className="btn btn-primary" onClick={handleSave} id="edge-note-save">
                Save
              </button>
              <button className="btn btn-secondary" onClick={handleCancel} id="edge-note-cancel">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {note && (
              <div className="edge-detail-note-section">
                <div className="edge-detail-note-heading">
                  <span className="edge-detail-note-title">Note</span>
                  {edge.noteUpdatedAt && note && (
                    <span className="edge-detail-note-date">{formatNoteDate(edge.noteUpdatedAt)}</span>
                  )}
                </div>

                <p className="edge-detail-note-body">{note}</p>
              </div>
            )}
            <div className="detail-panel-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setIsEditing(true)}
                id="edge-note-edit"
              >
                {note ? '✏️ Edit Note' : '➕ Add Note'}
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  onDelete(edge.id);
                  onClose();
                }}
                id="edge-detail-delete"
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
