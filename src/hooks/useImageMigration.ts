import { useEffect, useRef } from 'react';
import type { Node } from '../types';
import { putImageFromDataUrl } from '../services/imageStore';

/**
 * Lifts inline `data:` photos out of the canvas and into the local blob store.
 *
 * Canvases saved before photos moved to IndexedDB carry the base64 bytes in
 * `node.imageUrl`, which means they are still inside the synced document —
 * exactly the weight this was meant to remove. Each one is rewritten to a
 * `local:` reference, which shrinks the document on the next push.
 *
 * Deliberately not a one-shot: `adoptRemote` and JSON import can both bring
 * inline photos back after the first run, so this reacts to whatever is
 * currently on the canvas instead.
 */
export function useImageMigration({
  nodes,
  ready,
  updateNode,
}: {
  nodes: Node[];
  /**
   * Whether it is safe to modify the canvas. Migrating rewrites nodes, which
   * marks the canvas dirty; doing that while the first sync reconcile is still
   * in flight would turn a clean "adopt the server's copy" into a conflict the
   * user has to resolve by hand.
   */
  ready: boolean;
  updateNode: (id: string, updates: Partial<Node>) => void;
}) {
  /**
   * Nodes already migrated or found unconvertible, so a failure is not retried
   * on every render. Keyed by a fingerprint rather than the image itself: these
   * are base64 photos, and holding the full strings would pin megabytes for the
   * life of the session. Including the fingerprint means a node whose photo
   * changes later is still considered again.
   */
  const attempted = useRef(new Set<string>());

  const fingerprint = (node: Node): string => {
    const url = node.imageUrl as string;
    return node.id + ':' + url.length + ':' + url.slice(-24);
  };

  useEffect(() => {
    if (!ready) return;

    const pending = nodes.filter(
      (n) => n.imageUrl?.startsWith('data:') && !attempted.current.has(fingerprint(n))
    );
    if (pending.length === 0) return;

    let active = true;

    void (async () => {
      for (const node of pending) {
        const dataUrl = node.imageUrl as string;
        // Marked before the await: the effect re-runs on every dispatch below,
        // and without this the same node would be picked up again mid-flight.
        attempted.current.add(fingerprint(node));
        try {
          const ref = await putImageFromDataUrl(dataUrl);
          if (!active) return;
          updateNode(node.id, { imageUrl: ref });
        } catch (err) {
          // Leave the inline photo in place — it still renders, it just keeps
          // costing document size.
          console.warn('Failed to migrate inline image for node ' + node.id, err);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [nodes, ready, updateNode]);
}
