export function screenToCanvas(screenPoint, viewport) {
  return {
    x: (screenPoint.x - viewport.x) / viewport.zoom,
    y: (screenPoint.y - viewport.y) / viewport.zoom,
  }
}

export function canvasToScreen(canvasPoint, viewport) {
  return {
    x: canvasPoint.x * viewport.zoom + viewport.x,
    y: canvasPoint.y * viewport.zoom + viewport.y,
  }
}

export function getEdgePath(from, to, nodeWidth = 120, nodeHeight = 140) {
  const fromCenter = { x: from.x + nodeWidth / 2, y: from.y + nodeHeight / 2 }
  const toCenter = { x: to.x + nodeWidth / 2, y: to.y + nodeHeight / 2 }
  const dx = toCenter.x - fromCenter.x
  const dy = toCenter.y - fromCenter.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const curvature = Math.min(dist * 0.3, 80)
  const mx = (fromCenter.x + toCenter.x) / 2
  const my = (fromCenter.y + toCenter.y) / 2
  // perpendicular offset for curve
  const nx = -dy / (dist || 1) * curvature
  const ny = dx / (dist || 1) * curvature
  return {
    path: 'M ' + fromCenter.x + ' ' + fromCenter.y +
      ' Q ' + (mx + nx) + ' ' + (my + ny) +
      ' ' + toCenter.x + ' ' + toCenter.y,
    midpoint: { x: mx + nx * 0.5, y: my + ny * 0.5 },
  }
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function getDistance(p1, p2) {
  const dx = p1.x - p2.x
  const dy = p1.y - p2.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function getMidpoint(p1, p2) {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
}
