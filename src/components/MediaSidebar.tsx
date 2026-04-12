import React, { useState, useMemo } from 'react';
import type { Node } from '../types';
import { MEDIA_TYPE_EMOJI } from '../data/themes';

interface MediaSidebarProps {
  open: boolean;
  onClose: () => void;
  nodes: Node[];
  selectedNodeId: string | null;
  onFocusNode: (id: string) => void;
}

type SortOption = 'newest' | 'title' | 'type';

export default function MediaSidebar({
  open,
  onClose,
  nodes,
  selectedNodeId,
  onFocusNode,
}: MediaSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setBy] = useState<SortOption>('newest');

  const filteredNodes = useMemo(() => {
    let result = [...nodes];

    // Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (n) => n.title.toLowerCase().includes(q) || n.subtitle.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'type') {
        const typeComp = a.type.localeCompare(b.type);
        return typeComp !== 0 ? typeComp : a.title.localeCompare(b.title);
      }
      // default: newest (reverse createdAt)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [nodes, searchQuery, sortBy]);

  if (!open) return null;

  return (
    <div className="sidebar-overlay" onClick={onClose}>
      <div className="sidebar-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sidebar-header">
          <span className="sidebar-title">Media Library</span>
          <button className="sidebar-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="sidebar-filters">
          <div className="sidebar-search-wrap">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="sidebar-search"
              type="text"
              placeholder="Search media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="sidebar-sort-select"
            value={sortBy}
            onChange={(e) => setBy(e.target.value as SortOption)}
          >
            <option value="newest">Sort by: Newest</option>
            <option value="title">Sort by: Title (A-Z)</option>
            <option value="type">Sort by: Media Type</option>
          </select>
        </div>

        <div className="sidebar-body">
          {filteredNodes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
              No items found.
            </div>
          ) : (
            <div className="sidebar-list">
              {filteredNodes.map((node) => (
                <div
                  key={node.id}
                  className={'sidebar-item' + (selectedNodeId === node.id ? ' selected' : '')}
                  onClick={() => onFocusNode(node.id)}
                >
                  {node.imageUrl ? (
                    <img className="sidebar-item-thumb" src={node.imageUrl} alt="" />
                  ) : (
                    <div className="sidebar-item-thumb-placeholder">
                      {MEDIA_TYPE_EMOJI[node.type] || '📌'}
                    </div>
                  )}
                  <div className="sidebar-item-info">
                    <div className="sidebar-item-title">{node.title}</div>
                    <div className="sidebar-item-subtitle">{node.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
