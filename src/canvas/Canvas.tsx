import React, { useRef, useCallback, useEffect, useState } from 'react';
import type { Node, Edge, Viewport, Position, AppMode } from '../types';
import CanvasNode from './CanvasNode';
import EdgeLayer from './EdgeLayer';
import { screenToCanvas, clamp, getDistance, getMidpoint } from './canvasUtils';

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 3;

interface CanvasProps {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  selectedNodeId: string | null;
  connectingFromId: string | null;
  mode: AppMode;
  onSetViewport: (viewport: Viewport) => void;
  onMoveNode: (id: string, position: Position) => void;
  onSelectNode: (id: string) => void;
  onClearSelection: () => void;
  onStartConnect: (id: string) => void;
  onFinishConnect: (id?: string) => void;
  onSelectEdge: (id: string) => void;
  selectedEdgeId: string | null;
}

export default function Canvas({
  nodes,
  edges,
  viewport,
  selectedNodeId,
  connectingFromId,
  mode,
  onSetViewport,
  onMoveNode,
  onSelectNode,
  onClearSelection,
  onStartConnect,
  onFinishConnect,
  onSelectEdge,
  selectedEdgeId,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{
    startDist: number;
    startZoom: number;
    startMid: Position;
    startVP: Viewport;
  } | null>(null);
  const [connectingLine, setConnectingLine] = useState<{ from: Position; to: Position } | null>(null);

  // Always-current viewport, so gesture handlers don't need to close over the
  // prop (which would rebuild them — and re-subscribe listeners — every frame).
  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  // Pointer/wheel events can outpace the display (120Hz+ on recent phones), so
  // coalesce them into at most one viewport commit per animation frame.
  const pendingViewport = useRef<Viewport | null>(null);
  const rafId = useRef<number | null>(null);

  const scheduleViewport = useCallback(
    (next: Viewport) => {
      // Update the ref immediately so successive events within the same frame
      // compound off this value rather than the last committed one.
      viewportRef.current = next;
      pendingViewport.current = next;
      if (rafId.current !== null) return;
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        const vp = pendingViewport.current;
        pendingViewport.current = null;
        if (vp) onSetViewport(vp);
      });
    },
    [onSetViewport]
  );

  useEffect(
    () => () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    },
    []
  );

  // Read zoom without passing it as a prop, so zooming doesn't invalidate every node
  const getZoom = useCallback(() => viewportRef.current.zoom, []);

  // Wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const vp = viewportRef.current;
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newZoom = clamp(vp.zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM);

      const newX = mouseX - (mouseX - vp.x) * (newZoom / vp.zoom);
      const newY = mouseY - (mouseY - vp.y) * (newZoom / vp.zoom);

      scheduleViewport({ x: newX, y: newY, zoom: newZoom });
    },
    [scheduleViewport]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Pan with pointer (background drag)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!containerRef.current) return;
      
      const target = e.target as HTMLElement;
      if (target !== containerRef.current && !target.classList.contains('canvas-viewport')) {
        return;
      }

      // Clear selection when tapping background
      onClearSelection?.();
      if (mode === 'connect') {
        onFinishConnect?.();
        return;
      }

      const startX = e.clientX;
      const startY = e.clientY;
      const startVP = { ...viewportRef.current };
      containerRef.current.classList.add('grabbing');

      const onMove = (ev: PointerEvent) => {
        // Handle single-pointer pan
        if (ev.pointerId !== e.pointerId) return;
        scheduleViewport({
          x: startVP.x + (ev.clientX - startX),
          y: startVP.y + (ev.clientY - startY),
          zoom: startVP.zoom,
        });
      };

      const onUp = () => {
        containerRef.current?.classList.remove('grabbing');
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [scheduleViewport, onClearSelection, mode, onFinishConnect]
  );

  // Touch pinch-to-zoom
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        const t2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
        const vp = viewportRef.current;
        pinchRef.current = {
          startDist: getDistance(t1, t2),
          startZoom: vp.zoom,
          startMid: getMidpoint(t1, t2),
          startVP: { ...vp },
        };
      }
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current && containerRef.current) {
        e.preventDefault();
        const t1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        const t2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
        const curDist = getDistance(t1, t2);
        const curMid = getMidpoint(t1, t2);
        const scale = curDist / pinchRef.current.startDist;
        const newZoom = clamp(pinchRef.current.startZoom * scale, MIN_ZOOM, MAX_ZOOM);

        const rect = containerRef.current.getBoundingClientRect();
        const midX = pinchRef.current.startMid.x - rect.left;
        const midY = pinchRef.current.startMid.y - rect.top;

        const newX =
          midX -
          (midX - pinchRef.current.startVP.x) * (newZoom / pinchRef.current.startZoom) +
          (curMid.x - pinchRef.current.startMid.x);
        const newY =
          midY -
          (midY - pinchRef.current.startVP.y) * (newZoom / pinchRef.current.startZoom) +
          (curMid.y - pinchRef.current.startMid.y);

        scheduleViewport({ x: newX, y: newY, zoom: newZoom });
      }
    },
    [scheduleViewport]
  );

  const handleTouchEnd = useCallback(() => {
    pinchRef.current = null;
  }, []);

  // Connecting line tracking
  useEffect(() => {
    if (!connectingFromId) {
      setConnectingLine(null);
      return;
    }
    const sourceNode = nodes.find((n) => n.id === connectingFromId);
    if (!sourceNode) return;

    const fromPt = {
      x: sourceNode.position.x + 60,
      y: sourceNode.position.y + 70,
    };

    const onMove = (e: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const canvasPt = screenToCanvas(
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
        viewport
      );
      setConnectingLine({ from: fromPt, to: canvasPt });
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [connectingFromId, nodes, viewport]);

  const handleNodeMove = useCallback(
    (id: string, position: Position) => {
      onMoveNode(id, position);
    },
    [onMoveNode]
  );

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      onPointerDown={handlePointerDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="canvas-viewport"
        style={{
          transform:
            'translate(' +
            viewport.x +
            'px, ' +
            viewport.y +
            'px) scale(' +
            viewport.zoom +
            ')',
        }}
      >
        <EdgeLayer
          edges={edges}
          nodes={nodes}
          selectedEdgeId={selectedEdgeId}
          onSelectEdge={onSelectEdge}
          connectingLine={connectingLine}
        />
        {nodes.map((node) => (
          <CanvasNode
            key={node.id}
            node={node}
            selected={selectedNodeId === node.id}
            connecting={connectingFromId === node.id}
            mode={mode}
            getZoom={getZoom}
            onSelect={onSelectNode}
            onMove={handleNodeMove}
            onStartConnect={onStartConnect}
            onFinishConnect={onFinishConnect}
          />
        ))}
        {nodes.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🎨</div>
            <div className="empty-state-title">Your Media Canvas</div>
            <div className="empty-state-text">
              Tap the + button to add movies, music, art, or books and start building your personal
              media map.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
