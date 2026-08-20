import { useEffect, useState } from 'react';
import { isLocalImageRef, resolveLocalImage } from '../services/imageStore';

/**
 * Turns a node's `imageUrl` into something an `<img>` can render.
 *
 * Remote URLs pass through untouched; a `local:` reference is resolved to an
 * object URL from IndexedDB. `missing` is true only when a local reference has
 * no bytes on this device — a photo uploaded on another device, since blobs
 * stay local — so callers can fall back to the type emoji instead of showing a
 * broken image.
 */
export function useLocalImage(imageUrl: string | null | undefined): {
  src: string | null;
  missing: boolean;
} {
  const isLocal = isLocalImageRef(imageUrl);
  const [resolved, setResolved] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!isLocal) {
      setResolved(null);
      setMissing(false);
      return;
    }

    let active = true;
    setMissing(false);
    void resolveLocalImage(imageUrl as string).then((url) => {
      if (!active) return;
      setResolved(url);
      setMissing(url === null);
    });

    return () => {
      active = false;
    };
  }, [imageUrl, isLocal]);

  if (!isLocal) return { src: imageUrl || null, missing: false };
  return { src: resolved, missing };
}
