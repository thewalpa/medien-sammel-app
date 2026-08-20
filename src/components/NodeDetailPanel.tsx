import React, { useState, useEffect, useRef } from 'react';
import type { Node } from '../types';
import {
  ALL_TYPES,
  SOURCE_LABELS,
  MEDIA_TYPE_EMOJI,
  MEDIA_TYPE_LABELS,
} from '../data/themes';
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss';
import { useMediaSearch } from '../hooks/useMediaSearch';
import { hasTmdbKey } from '../services/tmdb';
import { SearchBar } from './SearchBar';
import { compressImageFile } from '../utils/imageHelper';
import { putImage, isLocalImageRef } from '../services/imageStore';
import { useLocalImage } from '../hooks/useLocalImage';

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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editType, setEditType] = useState('book');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [filledNotice, setFilledNotice] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaSearch = useMediaSearch();
  const { results, loading, error, query, search, changeType, clearSearch } = mediaSearch;

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
      setEditType(node.type || 'book');
      setEditImageUrl(node.imageUrl || '');
      setEditData({
        source: node.data?.source || 'manual',
        externalId: node.data?.externalId,
        rawData: node.data?.rawData,
      });
      setFilledNotice(null);
      clearSearch();
      setIsEditing(false);
      setIsLightboxOpen(false);
    }
  }, [node, clearSearch]);

  // Resolved before the early return so the hook order stays stable when the
  // panel closes. Both accept remote URLs and pre-existing data URLs unchanged.
  const { src: imageSrc } = useLocalImage(node?.imageUrl);
  const { src: editPreviewSrc } = useLocalImage(editImageUrl);

  if (!node) return null;

  const emoji = MEDIA_TYPE_EMOJI[node.type] || '📌';
  /* A device photo has no URL worth showing or editing — older canvases stored
     one inline as a data URL, newer ones as a `local:` reference. */
  const isDevicePhoto = isLocalImageRef(editImageUrl) || editImageUrl.startsWith('data:');

  const handleStartEdit = () => {
    setIsEditing(true);
    setFilledNotice(null);
    clearSearch();
  };

  const handleTypeChange = (newType: string) => {
    setEditType(newType);
    changeType(newType);
  };

  const handleSelectResult = (result: any) => {
    const fallbackYear = new Date().getFullYear();
    const finalYear = result.year ? parseInt(result.year, 10) || fallbackYear : fallbackYear;

    setEditTitle(result.title || '');
    setEditSubtitle(result.subtitle || '');
    setEditYear(String(finalYear));
    setEditType(result.type || editType);
    setEditImageUrl(result.imageUrl || '');
    setEditData({
      source: result.source,
      externalId: result.externalId,
      rawData: result.rawData,
    });
    setFilledNotice(`Details filled from ${SOURCE_LABELS[result.source] || result.source}`);
    clearSearch();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const blob = await compressImageFile(file, 900, 0.82);
      // Only the reference goes on the node; the bytes stay in IndexedDB so the
      // synced document does not carry them.
      const ref = await putImage(blob);
      setEditImageUrl(ref);
      setFilledNotice('Photo loaded from device');
    } catch (err: any) {
      alert(err?.message || 'Failed to process image');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    if (!editTitle.trim() || !editYear.trim()) return;
    const yearParsed = parseInt(editYear.trim(), 10);
    if (isNaN(yearParsed)) return;

    onUpdate(node.id, {
      title: editTitle.trim(),
      subtitle: editSubtitle.trim(),
      type: editType,
      imageUrl: editImageUrl.trim() ? editImageUrl.trim() : null,
      data: {
        ...node.data,
        ...editData,
        year: yearParsed,
      },
    });
    setIsEditing(false);
  };

  return (
    <>
      <div
        ref={ref}
        className={'detail-panel' + (isEditing ? ' editing' : '')}
        id="detail-panel"
        {...handlers}
      >
        <div className="modal-handle" />
        <div className="detail-panel-content">
          {isEditing ? (
            <div className="detail-panel-edit-form">
              {/* Header */}
              <div className="detail-edit-header">
                <span className="modal-title">Edit Details</span>
                <button
                  className="modal-close"
                  onClick={() => setIsEditing(false)}
                  aria-label="Close edit mode"
                  id="detail-edit-close"
                >
                  ✕
                </button>
              </div>

              {/* Reusable Search Bar */}
              <SearchBar
                ref={searchInputRef}
                placeholder={`Search online to auto-fill ${MEDIA_TYPE_LABELS[editType] || editType}...`}
                value={query}
                onChange={(val) => search(val, editType)}
                id="detail-edit-search-input"
              />

              {/* Search Loading & Error */}
              {editType === 'movie' && !hasTmdbKey() && query.trim().length >= 2 && (
                <div className="search-empty" style={{ color: 'var(--accent)', padding: '8px' }}>
                  Add your TMDB key in Settings to search movies &amp; series.
                </div>
              )}
              {loading && <div className="search-loading" style={{ padding: '12px' }}>Searching…</div>}
              {error && !loading && (
                <div className="search-empty" style={{ color: '#e05a50', padding: '12px' }}>
                  {error}
                </div>
              )}

              {/* Search Results Dropdown/List */}
              {!loading && !error && results.length > 0 && (
                <div className="search-results" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', padding: '2px 4px' }}>
                    Select an item to auto-fill:
                  </div>
                  {results.map((r: any, i: number) => (
                    <div
                      key={r.externalId || i}
                      className="search-result-item"
                      onClick={() => handleSelectResult(r)}
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
                        <div className="search-result-thumb-placeholder">
                          {MEDIA_TYPE_EMOJI[r.type]}
                        </div>
                      )}
                      <div className="search-result-info">
                        <div className="search-result-title">{r.title}</div>
                        {r.subtitle && <div className="search-result-sub">{r.subtitle}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
                <div className="search-empty" style={{ padding: '12px' }}>
                  No results found.
                </div>
              )}

              {/* Notice when details filled */}
              {filledNotice && (
                <div className="detail-notice-banner">
                  <span>✨ {filledNotice}</span>
                  <button
                    className="detail-notice-dismiss"
                    onClick={() => setFilledNotice(null)}
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Category Selector */}
              <div>
                <label className="label">Category</label>
                <div className="detail-type-pills">
                  {ALL_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={'detail-type-pill' + (editType === t ? ' active' : '')}
                      onClick={() => handleTypeChange(t)}
                      id={'edit-type-' + t}
                    >
                      {MEDIA_TYPE_EMOJI[t]} {MEDIA_TYPE_LABELS[t] || t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="label" htmlFor="edit-title">
                  Title
                </label>
                <input
                  id="edit-title"
                  className="input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Title"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="label" htmlFor="edit-subtitle">
                  Subtitle (Author, artist, publisher, etc.)
                </label>
                <input
                  id="edit-subtitle"
                  className="input"
                  value={editSubtitle}
                  onChange={(e) => setEditSubtitle(e.target.value)}
                  placeholder="Subtitle"
                />
              </div>

              {/* Year */}
              <div>
                <label className="label" htmlFor="edit-year">
                  Year
                </label>
                <input
                  id="edit-year"
                  className="input"
                  type="number"
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value)}
                  placeholder="Year"
                  min="0"
                  max="2100"
                />
              </div>

              {/* Cover Image Section: Compact Single-Row Image + URL */}
              <div>
                <label className="label" htmlFor="edit-image-url">
                  Cover Image
                </label>
                <div className="detail-image-input-row">
                  <div
                    className="detail-image-thumb"
                    onClick={() => fileInputRef.current?.click()}
                    title="Tap to choose photo from device"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        fileInputRef.current?.click();
                      }
                    }}
                  >
                    {editPreviewSrc ? (
                      <img
                        src={editPreviewSrc}
                        alt="Cover preview"
                        className="detail-image-thumb-img"
                        onError={(e: any) => {
                          e.target.style.opacity = '0.3';
                        }}
                      />
                    ) : (
                      <div className="detail-image-thumb-placeholder">
                        {MEDIA_TYPE_EMOJI[editType] || '📌'}
                      </div>
                    )}
                  </div>

                  <div className="detail-image-input-wrap">
                    <input
                      id="edit-image-url"
                      className="input"
                      value={isDevicePhoto ? '📷 Device Photo' : editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      placeholder="Image URL (or tap photo to upload)"
                      readOnly={isDevicePhoto}
                    />
                    {editImageUrl && (
                      <button
                        type="button"
                        className="detail-image-clear-btn"
                        onClick={() => setEditImageUrl('')}
                        title="Clear image"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Hidden Native File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                    id="device-image-upload"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="detail-panel-actions" style={{ marginTop: 'var(--space-md)' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={
                    !editTitle.trim() ||
                    !editYear.trim() ||
                    isNaN(parseInt(editYear, 10))
                  }
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
            /* VIEW MODE (Overview) */
            <>
              <div className="detail-panel-header">
                {imageSrc ? (
                  <img
                    className="detail-panel-image clickable"
                    src={imageSrc}
                    alt={node.title}
                    onClick={() => setIsLightboxOpen(true)}
                    title="Tap to view full image"
                  />
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
                {node.data?.source && `Source: ${SOURCE_LABELS[node.data.source] || node.data.source} · `}
                Year: {node.data?.year || 'Unknown'}
              </div>

              <div className="detail-panel-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleStartEdit}
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

      {/* Lightbox / Fullscreen Image Viewer on Phone/Desktop */}
      {isLightboxOpen && imageSrc && (
        <div
          className="image-lightbox-overlay"
          onClick={() => setIsLightboxOpen(false)}
          id="image-lightbox"
        >
          <div className="image-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={imageSrc} alt={node.title} className="image-lightbox-img" />
            <button
              className="image-lightbox-close"
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Close image preview"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
