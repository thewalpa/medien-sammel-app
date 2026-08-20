import React from 'react';
import type { RemoteState } from '../services/sync';

interface SyncConflictBannerProps {
  conflict: RemoteState | null;
  localNodeCount: number;
  localEdgeCount: number;
  onKeepLocal: () => void;
  onUseRemote: () => void;
}

/**
 * Shown when this device and another have both changed the canvas since they
 * last agreed. Neither side is discarded automatically — the counts let the
 * user tell the two apart before choosing.
 */
export default function SyncConflictBanner({
  conflict,
  localNodeCount,
  localEdgeCount,
  onKeepLocal,
  onUseRemote,
}: SyncConflictBannerProps) {
  if (!conflict) return null;

  const remoteNodes = conflict.doc?.nodes?.length ?? 0;
  const remoteEdges = conflict.doc?.edges?.length ?? 0;
  const changedAt = new Date(conflict.updatedAt);
  const when = isNaN(changedAt.getTime())
    ? ''
    : changedAt.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  return (
    <div className="sync-conflict" id="sync-conflict">
      <div className="sync-conflict-title">⚠ This canvas changed on another device</div>
      <p className="sync-conflict-text">
        Pick which version to keep. The other one will be replaced, so export a backup first if
        you're unsure.
      </p>

      <div className="sync-conflict-options">
        <button className="sync-conflict-option" onClick={onKeepLocal} id="sync-keep-local">
          <span className="sync-conflict-option-label">Keep this device</span>
          <span className="sync-conflict-option-meta">
            {localNodeCount} items · {localEdgeCount} connections
          </span>
        </button>
        <button className="sync-conflict-option" onClick={onUseRemote} id="sync-use-remote">
          <span className="sync-conflict-option-label">Use other device</span>
          <span className="sync-conflict-option-meta">
            {remoteNodes} items · {remoteEdges} connections
            {when ? ' · ' + when : ''}
          </span>
        </button>
      </div>
    </div>
  );
}
