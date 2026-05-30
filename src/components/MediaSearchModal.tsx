import React, { useState, useEffect, useRef } from 'react';
import { MEDIA_TYPE_EMOJI, MEDIA_TYPE_LABELS } from '../data/themes';
import { hasTmdbKey } from '../services/tmdb';
import type { Node } from '../types';
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss';

const MEDIA_TYPES = ['book', 'music', 'art', 'movie', 'quote', 'fashion', 'ad'];
const ENTITY_TYPES = ['person', 'place'];
const ALL_TYPES = [...MEDIA_TYPES, ...ENTITY_TYPES];

const PLACEHOLDER_YEAR = new Date().getFullYear().toString();

interface MediaSearchModalProps {
  open: boolean;
  onClose: () => void;
  onAddNode: (payload: Partial<Node>) => void;
  mediaSearch: any;
}

export default function MediaSearchModal({
  open,
  onClose,
  onAddNode,
  mediaSearch,
}: MediaSearchModalProps) {
  const { results, loading, error, query, mediaType, search, changeType, clearSearch } =
    mediaSearch;
  const [manualTitle, setManualTitle] = useState('');
  const [manualSubtitle, setManualSubtitle] = useState('');
  const [manualYear, setManualYear] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { ref, handlers } = useSwipeToDismiss<HTMLDivElement>({
    direction: 'down',
    threshold: 80,
    onDismiss: onClose,
  });

  useEffect(() => {
    if (open) {
      clearSearch();
      setManualTitle('');
      setManualSubtitle('');
      setManualYear(PLACEHOLDER_YEAR);
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [open, clearSearch]);

  if (!open) return null;

  const handleAddResult = (result: any) => {
    const fallbackYear = new Date().getFullYear();
    const finalYear = result.year ? parseInt(result.year, 10) || fallbackYear : fallbackYear;
    onAddNode({
      type: result.type,
      title: result.title,
      subtitle: result.subtitle,
      imageUrl: result.imageUrl,
      data: {
        externalId: result.externalId,
        source: result.source,
        year: finalYear,
        rawData: result.rawData,
      },
    });
    onClose();
  };

  const handleAddManual = () => {
    if (!manualTitle.trim() || !manualYear.trim()) return;
    const yearParsed = parseInt(manualYear.trim(), 10);
    if (isNaN(yearParsed)) return;
    onAddNode({
      type: mediaType,
      title: manualTitle.trim(),
      subtitle: manualSubtitle.trim(),
      imageUrl: null,
      data: {
        source: 'manual',
        year: yearParsed,
      },
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div ref={ref} className="modal-sheet" onClick={(e) => e.stopPropagation()} {...handlers}>
        <div className="modal-handle" />
        <div className="modal-header">
          <span className="modal-title">Add Media</span>
          <button className="modal-close" onClick={onClose} id="search-close">
            ✕
          </button>
        </div>

        {/* Type tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 var(--space-lg)', flexShrink: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Media Items</div>
          <div className="search-tabs" style={{ padding: 0 }}>
            {MEDIA_TYPES.map((t) => (
              <button
                key={t}
                className={'search-tab' + (mediaType === t ? ' active' : '')}
                onClick={() => changeType(t)}
                id={'tab-' + t}
              >
                {MEDIA_TYPE_EMOJI[t]} {MEDIA_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>Context Entities</div>
          <div className="search-tabs" style={{ padding: 0 }}>
            {ENTITY_TYPES.map((t) => (
              <button
                key={t}
                className={'search-tab' + (mediaType === t ? ' active' : '')}
                onClick={() => changeType(t)}
                id={'tab-' + t}
              >
                {MEDIA_TYPE_EMOJI[t]} {MEDIA_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Search input */}
        <div className="search-input-wrap">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="search-input"
            type="text"
            placeholder={'Search ' + MEDIA_TYPE_LABELS[mediaType] + '...'}
            value={query}
            onChange={(e) => search(e.target.value, mediaType)}
            id="search-input"
          />
        </div>

        {/* Results */}
        <div className="modal-body">
          {mediaType === 'movie' && !hasTmdbKey() && (
            <div className="search-empty" style={{ color: 'var(--accent)' }}>
              🎬 Add your free TMDB API key in Settings to search movies &amp; series.
              <br />
              <br />
              You can still add them manually below.
            </div>
          )}

          {loading && <div className="search-loading">Searching…</div>}
          {error && !loading && (
            <div className="search-empty" style={{ color: '#e05a50' }}>
              ⚠ {error}
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <div className="search-results">
              {results.map((r: any, i: number) => (
                <div
                  key={r.externalId || i}
                  className="search-result-item"
                  onClick={() => handleAddResult(r)}
                >
                  {r.imageUrl ? (
                    <img
                      className="search-result-thumb"
                      src={r.imageUrl}
                      alt=""
                      loading="lazy"
                      onError={(e: any) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="search-result-thumb-placeholder">{MEDIA_TYPE_EMOJI[r.type]}</div>
                  )}
                  <div className="search-result-info">
                    <div className="search-result-title">{r.title}</div>
                    {r.subtitle && <div className="search-result-sub">{r.subtitle}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && query.length >= 2 && results.length === 0 && (
            <div className="search-empty">
              No results found. Try a different query or add manually.
            </div>
          )}

          {/* Manual entry */}
          <div className="search-manual-entry">
            <h3>{MEDIA_TYPE_EMOJI[mediaType]} Add manually</h3>
            <input
              className="input"
              placeholder="Title"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              id="manual-title"
            />
            <input
              className="input"
              placeholder="Subtitle (artist, publisher, etc.)"
              value={manualSubtitle}
              onChange={(e) => setManualSubtitle(e.target.value)}
              id="manual-subtitle"
            />
            <input
              className="input"
              placeholder="Year"
              type="number"
              value={manualYear}
              onChange={(e) => setManualYear(e.target.value)}
              id="manual-year"
              min="0"
              max="2100"
            />
            <button
              className="btn btn-primary btn-block"
              onClick={handleAddManual}
              disabled={!manualTitle.trim() || !manualYear.trim() || isNaN(parseInt(manualYear, 10))}
              id="btn-add-manual"
            >
              Add to Canvas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
