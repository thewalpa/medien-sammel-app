import { useState, useEffect, useCallback, useRef } from 'react';
import type { Node, Edge, CanvasState } from '../types';
import {
  SyncAuthError,
  clearSyncCode,
  fetchRemote,
  fetchRemoteMeta,
  getSyncCode,
  getSyncMeta,
  normalizeSyncCode,
  pushRemote,
  setSyncCode,
  setSyncMeta,
} from '../services/sync';
import type { RemoteState } from '../services/sync';

export type SyncStatus =
  | 'off'
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'conflict'
  | 'bad-code'
  | 'error';

interface UseSyncOptions {
  nodes: Node[];
  edges: Edge[];
  /** Local IndexedDB load has finished — safe to compare against the server. */
  hydrated: boolean;
  loadState: (data: Partial<CanvasState>) => void;
}

/** Matches the local save debounce, so a burst of edits produces one upload. */
const PUSH_DEBOUNCE_MS = 1500;

export function useSync({ nodes, edges, hydrated, loadState }: UseSyncOptions) {
  const [code, setCodeState] = useState<string | null>(() => getSyncCode());
  const [status, setStatus] = useState<SyncStatus>(() => (getSyncCode() ? 'idle' : 'off'));
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [conflict, setConflict] = useState<RemoteState | null>(null);

  // The exact arrays last agreed with the server. Reference equality is enough:
  // the reducer replaces the array on every edit and preserves it otherwise, so
  // this detects local changes without hashing the whole canvas.
  const syncedNodes = useRef<Node[] | null>(null);
  const syncedEdges = useRef<Edge[] | null>(null);
  /**
   * Whether the persisted dirty flag is already set. Without this we'd hit
   * localStorage on every state change — and since dragging a node dispatches
   * MOVE_NODE per pointermove, that meant a synchronous read+write on the drag
   * hot path at pointer-event rate.
   */
  const dirtyRecorded = useRef(false);
  /**
   * Set once the server rejects this code. Kept in a ref rather than read from
   * `status` so the upload effect doesn't need `status` in its dependencies —
   * an unissued or mistyped code would otherwise retry on every single edit.
   */
  const codeRejected = useRef(false);

  // Latest content, so async callbacks never push a stale snapshot.
  const latest = useRef({ nodes, edges });
  useEffect(() => {
    latest.current = { nodes, edges };
  }, [nodes, edges]);

  // Establish the baseline as soon as local data is in, so hydration itself
  // doesn't read as a local edit. This is a one-shot lazy initialisation guarded
  // by the null check — it must happen before `isDirty` is computed below, which
  // is why it isn't an effect. A dirty flag persisted from a previous session
  // wins: it means edits were made offline and never accepted by the server.
  if (hydrated && syncedNodes.current === null && !getSyncMeta().dirty) {
    syncedNodes.current = nodes;
    syncedEdges.current = edges;
  }

  const isDirty =
    hydrated && (nodes !== syncedNodes.current || edges !== syncedEdges.current);

  const markSynced = useCallback((version: number, syncedAt: string, n: Node[], e: Edge[]) => {
    syncedNodes.current = n;
    syncedEdges.current = e;
    dirtyRecorded.current = false;
    setSyncMeta({ version, dirty: false });
    setLastSyncedAt(syncedAt);
    setStatus('synced');
  }, []);

  /** Replace local content with the server's copy. */
  const adoptRemote = useCallback(
    (remote: RemoteState) => {
      // LOAD_STATE stores these exact arrays, so assigning them here means the
      // next render compares equal and the canvas reads as clean.
      loadState({ nodes: remote.doc.nodes || [], edges: remote.doc.edges || [] });
      syncedNodes.current = remote.doc.nodes || [];
      syncedEdges.current = remote.doc.edges || [];
      dirtyRecorded.current = false;
      setSyncMeta({ version: remote.version, dirty: false });
      setLastSyncedAt(remote.updatedAt);
      setConflict(null);
      setStatus('synced');
    },
    [loadState]
  );

  const handleError = useCallback((err: unknown) => {
    if (err instanceof SyncAuthError) {
      codeRejected.current = true;
      setStatus('bad-code');
      return;
    }
    setStatus(navigator.onLine ? 'error' : 'offline');
  }, []);

  const push = useCallback(
    async (activeCode: string, baseVersion: number) => {
      const { nodes: n, edges: e } = latest.current;
      setStatus('syncing');
      try {
        const result = await pushRemote(activeCode, { nodes: n, edges: e }, baseVersion);
        if (result.ok) {
          markSynced(result.version, result.updatedAt, n, e);
        } else {
          // Someone else advanced the server. Our local edits are unpushed, so
          // this needs a human decision rather than a silent overwrite.
          setConflict(result.conflict);
          setStatus('conflict');
        }
      } catch (err) {
        handleError(err);
      }
    },
    [markSynced, handleError]
  );

  /** Compare against the server and reconcile. */
  const pull = useCallback(
    async (activeCode: string) => {
      if (!navigator.onLine) {
        setStatus('offline');
        return;
      }
      setStatus('syncing');
      try {
        const meta = getSyncMeta();
        const remoteMeta = await fetchRemoteMeta(activeCode);

        // Nothing stored yet for this code — seed it from this device.
        if (!remoteMeta) {
          await push(activeCode, 0);
          return;
        }

        const dirty =
          latest.current.nodes !== syncedNodes.current ||
          latest.current.edges !== syncedEdges.current;

        // Connecting a fresh device: there are no local edits worth protecting,
        // so take the server's canvas instead of asking the user to choose.
        const localEmpty =
          latest.current.nodes.length === 0 && latest.current.edges.length === 0;

        if (remoteMeta.version === meta.version) {
          if (dirty) await push(activeCode, meta.version);
          else {
            setLastSyncedAt(remoteMeta.updatedAt);
            setStatus('synced');
          }
          return;
        }

        // Server has moved on since we last agreed with it.
        const remote = await fetchRemote(activeCode);
        if (!remote) {
          await push(activeCode, 0);
          return;
        }
        if (dirty && !localEmpty) {
          setConflict(remote);
          setStatus('conflict');
        } else {
          adoptRemote(remote);
        }
      } catch (err) {
        handleError(err);
      }
    },
    [push, adoptRemote, handleError]
  );

  // Reconcile on connect, when the app comes to the foreground, and when the
  // network returns — the cheap `?meta=1` probe keeps this nearly free.
  useEffect(() => {
    if (!code || !hydrated) return;
    void pull(code);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void pull(code);
    };
    const onOnline = () => void pull(code);

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [code, hydrated, pull]);

  // Debounced upload of local edits.
  useEffect(() => {
    if (!code || !hydrated || !isDirty) return;
    // Record the intent once per clean->dirty transition, so closing the app
    // before the upload completes still leaves a trace of unpushed work — but
    // without touching localStorage on every drag frame.
    if (!dirtyRecorded.current) {
      dirtyRecorded.current = true;
      setSyncMeta({ version: getSyncMeta().version, dirty: true });
    }

    if (conflict) return; // waiting on the user; don't fight the server
    if (codeRejected.current) return; // no point retrying credentials we know are bad
    if (!navigator.onLine) {
      setStatus('offline');
      return;
    }

    const timer = setTimeout(() => {
      void push(code, getSyncMeta().version);
    }, PUSH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [code, hydrated, isDirty, nodes, edges, conflict, push]);

  const connect = useCallback((raw: string) => {
    const normalized = normalizeSyncCode(raw);
    if (!normalized) return;
    setSyncCode(normalized);
    setSyncMeta({ version: 0, dirty: true }); // force a reconcile against the server
    syncedNodes.current = null;
    syncedEdges.current = null;
    dirtyRecorded.current = true;
    codeRejected.current = false;
    setConflict(null);
    setCodeState(normalized);
    setStatus('idle');
  }, []);

  const disconnect = useCallback(() => {
    clearSyncCode();
    setCodeState(null);
    setConflict(null);
    setLastSyncedAt(null);
    setStatus('off');
  }, []);

  /** Conflict resolution: overwrite the server with this device's canvas. */
  const keepLocal = useCallback(() => {
    if (!code || !conflict) return;
    const target = conflict.version;
    setConflict(null);
    void push(code, target);
  }, [code, conflict, push]);

  /** Conflict resolution: discard local edits and take the server's canvas. */
  const useRemote = useCallback(() => {
    if (!conflict) return;
    adoptRemote(conflict);
  }, [conflict, adoptRemote]);

  return {
    code,
    status,
    lastSyncedAt,
    conflict,
    connect,
    disconnect,
    keepLocal,
    useRemote,
    syncNow: useCallback(() => {
      if (code) void pull(code);
    }, [code, pull]),
  };
}
