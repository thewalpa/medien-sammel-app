import React, { useRef, useCallback, useEffect, useState } from 'react'
import CanvasNode from './CanvasNode'
import EdgeLayer from './EdgeLayer'
import { screenToCanvas, clamp, getDistance, getMidpoint } from './canvasUtils'

const MIN_ZOOM = 0.15
const MAX_ZOOM = 3

export default function Canvas({
  nodes, edges, viewport, selectedNodeId, connectingFromId, mode,
  onSetViewport, onMoveNode, onSelectNode, onClearSelection,
  onStartConnect, onFinishConnect, onSelectEdge, selectedEdgeId,
}) {
  const containerRef = useRef(null)
  const panRef = useRef(null)
  const pinchRef = useRef(null)
  const [connectingLine, setConnectingLine] = useState(null)

  // Wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92
    const newZoom = clamp(viewport.zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM)

    const newX = mouseX - (mouseX - viewport.x) * (newZoom / viewport.zoom)
    const newY = mouseY - (mouseY - viewport.y) * (newZoom / viewport.zoom)

    onSetViewport({ x: newX, y: newY, zoom: newZoom })
  }, [viewport, onSetViewport])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Pan with pointer (background drag)
  const handlePointerDown = useCallback((e) => {
    if (e.target !== containerRef.current && e.target !== containerRef.current.querySelector('.canvas-viewport')) {
      return
    }

    // Clear selection when tapping background
    onClearSelection?.()
    if (mode === 'connect') {
      onFinishConnect?.()
      return
    }

    const startX = e.clientX
    const startY = e.clientY
    const startVP = { ...viewport }
    containerRef.current.classList.add('grabbing')

    const onMove = (ev) => {
      // Handle single-pointer pan
      if (ev.pointerId !== e.pointerId) return
      onSetViewport({
        x: startVP.x + (ev.clientX - startX),
        y: startVP.y + (ev.clientY - startY),
        zoom: startVP.zoom,
      })
    }

    const onUp = () => {
      containerRef.current?.classList.remove('grabbing')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [viewport, onSetViewport, onClearSelection, mode, onFinishConnect])

  // Touch pinch-to-zoom
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const t1 = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      const t2 = { x: e.touches[1].clientX, y: e.touches[1].clientY }
      pinchRef.current = {
        startDist: getDistance(t1, t2),
        startZoom: viewport.zoom,
        startMid: getMidpoint(t1, t2),
        startVP: { ...viewport },
      }
    }
  }, [viewport])

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault()
      const t1 = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      const t2 = { x: e.touches[1].clientX, y: e.touches[1].clientY }
      const curDist = getDistance(t1, t2)
      const curMid = getMidpoint(t1, t2)
      const scale = curDist / pinchRef.current.startDist
      const newZoom = clamp(pinchRef.current.startZoom * scale, MIN_ZOOM, MAX_ZOOM)

      const rect = containerRef.current.getBoundingClientRect()
      const midX = pinchRef.current.startMid.x - rect.left
      const midY = pinchRef.current.startMid.y - rect.top

      const newX = midX - (midX - pinchRef.current.startVP.x) * (newZoom / pinchRef.current.startZoom)
        + (curMid.x - pinchRef.current.startMid.x)
      const newY = midY - (midY - pinchRef.current.startVP.y) * (newZoom / pinchRef.current.startZoom)
        + (curMid.y - pinchRef.current.startMid.y)

      onSetViewport({ x: newX, y: newY, zoom: newZoom })
    }
  }, [onSetViewport])

  const handleTouchEnd = useCallback(() => {
    pinchRef.current = null
  }, [])

  // Connecting line tracking
  useEffect(() => {
    if (!connectingFromId) {
      setConnectingLine(null)
      return
    }
    const sourceNode = nodes.find((n) => n.id === connectingFromId)
    if (!sourceNode) return

    const fromPt = {
      x: sourceNode.position.x + 60,
      y: sourceNode.position.y + 70,
    }

    const onMove = (e) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const canvasPt = screenToCanvas(
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
        viewport
      )
      setConnectingLine({ from: fromPt, to: canvasPt })
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [connectingFromId, nodes, viewport])



  const handleNodeMove = useCallback((id, position) => {
    onMoveNode(id, position)
  }, [onMoveNode])

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
          transform: 'translate(' + viewport.x + 'px, ' + viewport.y + 'px) scale(' + viewport.zoom + ')',
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
            zoom={viewport.zoom}
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
              Tap the + button to add movies, music, art, or books and start building your personal media map.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
