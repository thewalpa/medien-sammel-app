import React, { useState, useMemo } from 'react';
import type { Node } from '../types';
import { MEDIA_TYPE_EMOJI, MEDIA_TYPE_LABELS } from '../data/themes';
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss';

interface MediaSidebarProps {
  open: boolean;
  onClose: () => void;
  nodes: Node[];
  selectedNodeId: string | null;
  onFocusNode: (id: string) => void;
}

type SortOption = 'newest' | 'title' | 'type';

// ── Reusable item row ──────────────────────────────────────────────────────
function SidebarItem({
  node,
  selected,
  onFocusNode,
}: {
  node: Node;
  selected: boolean;
  onFocusNode: (id: string) => void;
}) {
  return (
    <div
      className={'sidebar-item' + (selected ? ' selected' : '')}
      onClick={() => onFocusNode(node.id)}
    >
      {node.imageUrl ? (
        <img className="sidebar-item-thumb" src={node.imageUrl} alt="" loading="lazy" />
      ) : (
        <div className={'sidebar-item-thumb-placeholder ' + node.type}>
          {MEDIA_TYPE_EMOJI[node.type] || '📌'}
        </div>
      )}
      <div className="sidebar-item-info">
        <div className="sidebar-item-title">{node.title}</div>
        <div className="sidebar-item-subtitle">{node.subtitle}</div>
      </div>
      {selected && <div className="sidebar-item-active-dot" />}
    </div>
  );
}

export default function MediaSidebar({
  open,
  onClose,
  nodes,
  selectedNodeId,
  onFocusNode,
}: MediaSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setBy] = useState<SortOption>('newest');

  const { ref, handlers } = useSwipeToDismiss<HTMLDivElement>({
    direction: 'left',
    threshold: 72,
    onDismiss: onClose,
  });

  const filteredNodes = useMemo(() => {
    let result = [...nodes];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (n) => n.title.toLowerCase().includes(q) || n.subtitle.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'type') {
        const typeComp = a.type.localeCompare(b.type);
        return typeComp !== 0 ? typeComp : a.title.localeCompare(b.title);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [nodes, searchQuery, sortBy]);

  // When sorting by type, group the results into buckets
  const groupedByType = useMemo(() => {
    if (sortBy !== 'type') return null;
    const groups: Record<string, typeof filteredNodes> = {};
    for (const node of filteredNodes) {
      if (!groups[node.type]) groups[node.type] = [];
      groups[node.type].push(node);
    }
    // Preserve the same alphabetical-type order as the sort above
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredNodes, sortBy]);

  if (!open) return null;

  return (
    <div className="sidebar-overlay" onClick={onClose}>
      <div
        ref={ref}
        className="sidebar-sheet glass"
        onClick={(e) => e.stopPropagation()}
        {...handlers}
      >
        {/* Vertical drag handle */}
        <div className="sidebar-drag-rail">
          <div className="sidebar-drag-handle" />
        </div>

        <div className="sidebar-header">
          <span className="sidebar-title">Media Library</span>
          <button className="modal-close" onClick={onClose} id="sidebar-close" aria-label="Close sidebar">
            ✕
          </button>
        </div>

        <div className="sidebar-count-bar">
          <span className="sidebar-count">{filteredNodes.length} item{filteredNodes.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="sidebar-filters">
          <div className="search-input-wrap" style={{ padding: 0 }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ left: '12px' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="search-input"
              style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--space-sm) var(--space-md) var(--space-sm) 38px' }}
              type="text"
              placeholder="Search media…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="sidebar-search"
            />
          </div>

          <div className="sidebar-sort-row">
            {(['newest', 'title', 'type'] as SortOption[]).map((opt) => (
              <button
                key={opt}
                className={'sidebar-sort-pill' + (sortBy === opt ? ' active' : '')}
                onClick={() => setBy(opt)}
              >
                {opt === 'newest' ? 'Newest' : opt === 'title' ? 'A–Z' : 'Type'}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-body">
          {filteredNodes.length === 0 ? (
            <div className="sidebar-empty">
              <div className="sidebar-empty-icon">🔍</div>
              <div className="sidebar-empty-text">No items found</div>
            </div>
          ) : groupedByType ? (
            // ── Grouped view (sort by type) ─────────────────────────
            <div className="sidebar-groups">
              {groupedByType.map(([type, items]) => (
                <div key={type} className="sidebar-group">
                  <div className="sidebar-group-header">
                    <span className="sidebar-group-emoji">{MEDIA_TYPE_EMOJI[type] || '📌'}</span>
                    <span className="sidebar-group-label">{MEDIA_TYPE_LABELS[type] || type}</span>
                    <span className="sidebar-group-count">{items.length}</span>
                  </div>
                  {items.map((node) => (
                    <SidebarItem
                      key={node.id}
                      node={node}
                      selected={selectedNodeId === node.id}
                      onFocusNode={onFocusNode}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            // ── Flat view (newest / title) ───────────────────────────
            <div className="sidebar-list">
              {filteredNodes.map((node) => (
                <SidebarItem
                  key={node.id}
                  node={node}
                  selected={selectedNodeId === node.id}
                  onFocusNode={onFocusNode}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
