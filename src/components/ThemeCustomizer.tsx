import React, { useState } from 'react';
import { THEMES, ANIMATED_BACKGROUNDS } from '../data/themes';
import { getTmdbKey, setTmdbKey } from '../services/tmdb';
import { exportCanvasAsJSON, importCanvasFromJSON } from '../services/storage';
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss';

interface ThemeCustomizerProps {
  open: boolean;
  onClose: () => void;
  themeId: string;
  bgId: string;
  customBgUrl: string;
  onChangeTheme: (id: string) => void;
  onChangeBg: (id: string) => void;
  onChangeCustomBg: (url: string) => void;
}

export default function ThemeCustomizer({
  open,
  onClose,
  themeId,
  bgId,
  customBgUrl,
  onChangeTheme,
  onChangeBg,
  onChangeCustomBg,
}: ThemeCustomizerProps) {
  const [tmdbKey, setTmdbKeyLocal] = useState(getTmdbKey());
  const [importMsg, setImportMsg] = useState('');

  const { ref, handlers } = useSwipeToDismiss<HTMLDivElement>({
    direction: 'down',
    threshold: 80,
    onDismiss: onClose,
  });

  if (!open) return null;

  const handleSaveTmdb = () => {
    setTmdbKey(tmdbKey);
  };

  const handleExport = () => {
    exportCanvasAsJSON().catch((e) => console.error('Export failed:', e));
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;
      try {
        await importCanvasFromJSON(file);
        setImportMsg('Imported! Refresh the page to see changes.');
      } catch (err: any) {
        setImportMsg('Import failed: ' + err.message);
      }
    };
    input.click();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={ref}
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '95dvh' }}
        {...handlers}
      >
        <div className="modal-handle" />
        <div className="modal-header">
          <span className="modal-title">Settings</span>
          <button className="modal-close" onClick={onClose} id="settings-close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Theme presets */}
          <div className="theme-section">
            <div className="theme-section-title">Theme</div>
            <div className="theme-presets">
              {THEMES.map((theme) => (
                <div
                  key={theme.id}
                  className={'theme-preset-card' + (themeId === theme.id ? ' active' : '')}
                  onClick={() => onChangeTheme(theme.id)}
                >
                  <div className="theme-preset-swatch" style={{ background: theme.swatch }} />
                  <div className="theme-preset-name">{theme.name}</div>
                  <div
                    style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}
                  >
                    {theme.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Animated backgrounds */}
          <div className="theme-section">
            <div className="theme-section-title">Background Effect</div>
            <div className="bg-options">
              {ANIMATED_BACKGROUNDS.map((bg) => (
                <div
                  key={bg.id}
                  className={'bg-option' + (bgId === bg.id ? ' active' : '')}
                  onClick={() => onChangeBg(bg.id)}
                  style={{
                    background: bg.id === 'none' ? 'var(--bg-primary)' : 'var(--bg-primary)',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {/* Mini preview of the animated background */}
                  {bg.preview && bg.id !== 'none' && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: bg.preview,
                        animation:
                          bg.id === 'aurora'
                            ? 'auroraShift 6s ease-in-out infinite alternate'
                            : bg.id === 'fireflies'
                              ? 'fireflyDrift 4s ease-in-out infinite alternate'
                              : bg.id === 'waves'
                                ? 'waveDrift 4s ease-in-out infinite'
                                : 'none',
                        backgroundSize: bg.id === 'waves' ? '200% 200%' : undefined,
                      }}
                    />
                  )}
                  {bg.id === 'none' && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        opacity: 0.4,
                      }}
                    >
                      ∅
                    </div>
                  )}
                  <div className="bg-option-label">{bg.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom background URL */}
          <div className="theme-section">
            <div className="theme-section-title">Custom Background Image</div>
            <input
              className="input"
              placeholder="Paste image URL..."
              value={customBgUrl}
              onChange={(e) => onChangeCustomBg(e.target.value)}
              id="custom-bg-input"
            />
          </div>

          {/* TMDB API Key */}
          <div className="theme-section">
            <div className="theme-section-title">TMDB API Key (Movies &amp; Series)</div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
              Get a free key at{' '}
              <span style={{ color: 'var(--accent)' }}>themoviedb.org/settings/api</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="input"
                type="password"
                placeholder="Enter API key..."
                value={tmdbKey}
                onChange={(e) => setTmdbKeyLocal(e.target.value)}
                id="tmdb-key-input"
              />
              <button className="btn btn-primary" onClick={handleSaveTmdb} id="btn-save-tmdb">
                Save
              </button>
            </div>
          </div>

          {/* Data management */}
          <div className="theme-section">
            <div className="theme-section-title">Data</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={handleExport} id="btn-export">
                📦 Export Canvas
              </button>
              <button className="btn btn-secondary" onClick={handleImport} id="btn-import">
                📥 Import Canvas
              </button>
            </div>
            {importMsg && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--accent)' }}>
                {importMsg}
              </div>
            )}
          </div>

          <div
            style={{
              textAlign: 'center',
              padding: '16px 0',
              color: 'var(--text-tertiary)',
              fontSize: '11px',
            }}
          >
            Medien Sammel App v0.1.2
          </div>
        </div>
      </div>
    </div>
  );
}
