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
  const [selectedStrategy, setSelectedStrategy] = useState<LayoutStrategy>('radial');

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {/* Decade Orbit */}
              <div 
                className={`theme-preset-card ${selectedStrategy === 'radial' ? 'active' : ''}`}
                onClick={() => setSelectedStrategy('radial')}
                style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }}
                id="strategy-radial"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>🪐</span>
                  <span className="theme-preset-name">Decade Orbit</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '26px' }}>
                  Groups media items by decade into circular orbits arranged in a ring layout.
                </div>
              </div>

              {/* Spiral Timeline */}
              <div 
                className={`theme-preset-card ${selectedStrategy === 'spiral' ? 'active' : ''}`}
                onClick={() => setSelectedStrategy('spiral')}
                style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }}
                id="strategy-spiral"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>🌀</span>
                  <span className="theme-preset-name">Spiral Timeline</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '26px' }}>
                  Arranges all items chronologically in a continuous winding spiral curling outward.
                </div>
              </div>

              {/* Decade Columns */}
              <div 
                className={`theme-preset-card ${selectedStrategy === 'decade' ? 'active' : ''}`}
                onClick={() => setSelectedStrategy('decade')}
                style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }}
                id="strategy-decade"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>📊</span>
                  <span className="theme-preset-name">Decade Columns</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '26px' }}>
                  Aligns decade groups side-by-side in vertical columns (grid layout).
                </div>
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
