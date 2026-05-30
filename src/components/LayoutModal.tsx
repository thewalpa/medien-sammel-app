import React, { useState } from 'react';
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss';
import type { LayoutStrategy } from '../utils/layout';

interface LayoutModalProps {
  open: boolean;
  onClose: () => void;
  onApplyLayout: (strategy: LayoutStrategy) => void;
  nodeCount: number;
}

export default function LayoutModal({
  open,
  onClose,
  onApplyLayout,
  nodeCount,
}: LayoutModalProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<LayoutStrategy>('decade');

  const { ref, handlers } = useSwipeToDismiss<HTMLDivElement>({
    direction: 'down',
    threshold: 80,
    onDismiss: onClose,
  });

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={ref}
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
        {...handlers}
      >
        <div className="modal-handle" />
        <div className="modal-header">
          <span className="modal-title">Reorganize Layout</span>
          <button className="modal-close" onClick={onClose} id="layout-close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
            Choose a strategy to automatically rearrange the placement of nodes on your canvas. Connections between nodes will remain unchanged.
          </p>

          <div className="theme-section">
            <div className="theme-section-title">Layout Strategy</div>
            <div 
              className={`theme-preset-card ${selectedStrategy === 'decade' ? 'active' : ''}`}
              onClick={() => setSelectedStrategy('decade')}
              style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }}
              id="strategy-decade"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📅</span>
                <span className="theme-preset-name">Decade Clustering</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '26px' }}>
                Groups and clusters media items horizontally by their release/creation decade. Within each decade, items are laid out in a grid.
              </div>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <button
              className="btn btn-primary btn-block"
              onClick={() => {
                onApplyLayout(selectedStrategy);
                onClose();
              }}
              disabled={nodeCount === 0}
              id="btn-apply-layout"
            >
              Apply Layout ({nodeCount} Node{nodeCount !== 1 ? 's' : ''})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
