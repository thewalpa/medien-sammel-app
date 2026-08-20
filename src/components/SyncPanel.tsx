import React, { useState } from 'react';
import type { SyncStatus } from '../hooks/useSync';
import { formatSyncCode } from '../services/sync';

interface SyncPanelProps {
  code: string | null;
  status: SyncStatus;
  lastSyncedAt: string | null;
  onConnect: (code: string) => void;
  onDisconnect: () => void;
  onSyncNow: () => void;
}

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes + (minutes === 1 ? ' minute ago' : ' minutes ago');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
  const days = Math.round(hours / 24);
  return days + (days === 1 ? ' day ago' : ' days ago');
}

function statusLine(status: SyncStatus, lastSyncedAt: string | null): { icon: string; text: string } {
  switch (status) {
    case 'syncing':
      return { icon: '↻', text: 'Syncing…' };
    case 'synced': {
      const when = relativeTime(lastSyncedAt);
      return { icon: '✓', text: when ? 'Synced ' + when : 'Synced' };
    }
    case 'offline':
      return { icon: '⚡', text: 'Offline — changes are saved on this device' };
    case 'conflict':
      return { icon: '⚠', text: 'This device and another have both changed' };
    case 'bad-code':
      return { icon: '✕', text: 'That sync code was rejected' };
    case 'error':
      return { icon: '✕', text: "Couldn't reach the sync service" };
    default:
      return { icon: '·', text: 'Waiting to sync' };
  }
}

export default function SyncPanel({
  code,
  status,
  lastSyncedAt,
  onConnect,
  onDisconnect,
  onSyncNow,
}: SyncPanelProps) {
  const [entry, setEntry] = useState('');
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard
      ?.writeText(formatSyncCode(code))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => setRevealed(true));
  };

  const { icon, text } = statusLine(status, lastSyncedAt);

  if (!code) {
    return (
      <div className="theme-section">
        <div className="theme-section-title">Sync Across Devices</div>
        <p className="sync-hint">
          Enter your sync code to keep the same canvas on every device.
        </p>

        <div className="sync-connect-row">
          <input
            className="input"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder="Enter existing code"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            id="sync-code-input"
          />
          <button
            className="btn btn-secondary"
            disabled={!entry.trim()}
            onClick={() => {
              onConnect(entry);
              setEntry('');
            }}
            id="sync-connect"
          >
            Connect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-section">
      <div className="theme-section-title">Sync Across Devices</div>

      <div className="sync-code-display">
        <code className={'sync-code' + (revealed ? '' : ' masked')} onClick={() => setRevealed(true)}>
          {revealed ? formatSyncCode(code) : '••••-••••-••••-••••-••••-••••-••'}
        </code>
        <div className="sync-code-actions">
          <button className="btn btn-secondary" onClick={() => setRevealed((r) => !r)} id="sync-reveal">
            {revealed ? 'Hide' : 'Show'}
          </button>
          <button className="btn btn-secondary" onClick={handleCopy} id="sync-copy">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <p className="sync-hint">
        Enter this code on another device to sync it.
      </p>

      <div className={'sync-status sync-status-' + status}>
        <span className="sync-status-icon">{icon}</span>
        {text}
      </div>

      <div className="sync-actions">
        <button
          className="btn btn-secondary"
          onClick={onSyncNow}
          disabled={status === 'syncing'}
          id="sync-now"
        >
          ↻ Sync Now
        </button>
        <button className="btn btn-danger" onClick={onDisconnect} id="sync-disconnect">
          Disconnect
        </button>
      </div>
    </div>
  );
}
