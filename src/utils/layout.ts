import type { Node, Position } from '../types';

export type LayoutStrategy = 'decade' | 'radial' | 'spiral';

// ── 1. Decade Columns Layout ───────────────────────────────────────────────
export function applyDecadeClustering(nodes: Node[]): Record<string, Position> {
  const positions: Record<string, Position> = {};
  
  // Group nodes by decade
  const groups: Record<string, Node[]> = {};
  
  for (const node of nodes) {
    const year = node.data?.year;
    let key = 'Unknown';
    if (year !== undefined && year !== null && !isNaN(year)) {
      const decade = Math.floor(year / 10) * 10;
      key = `${decade}s`;
    }
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(node);
  }

  // Sort group keys
  const groupKeys = Object.keys(groups).sort((a, b) => {
    if (a === 'Unknown') return 1;
    if (b === 'Unknown') return -1;
    const aVal = parseInt(a, 10);
    const bVal = parseInt(b, 10);
    return aVal - bVal;
  });

  const NODE_X_SPACING = 150;
  const NODE_Y_SPACING = 210;

  let currentClusterX = 0;

  for (const key of groupKeys) {
    const groupNodes = groups[key];
    groupNodes.sort((a, b) => {
      const yearA = a.data?.year || 0;
      const yearB = b.data?.year || 0;
      if (yearA !== yearB) return yearA - yearB;
      return a.title.localeCompare(b.title);
    });

    const cols = groupNodes.length > 1 ? 2 : 1;
    
    for (let i = 0; i < groupNodes.length; i++) {
      const node = groupNodes[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      const x = currentClusterX + col * NODE_X_SPACING;
      const y = row * NODE_Y_SPACING;
      
      positions[node.id] = { x, y };
    }

    currentClusterX += cols * NODE_X_SPACING + 160; 
  }

  return positions;
}

// ── 2. Decade Orbit (Radial) Layout ─────────────────────────────────────────
export function applyRadialDecadeLayout(nodes: Node[]): Record<string, Position> {
  const positions: Record<string, Position> = {};
  
  // Group nodes by decade
  const groups: Record<string, Node[]> = {};
  
  for (const node of nodes) {
    const year = node.data?.year;
    let key = 'Unknown';
    if (year !== undefined && year !== null && !isNaN(year)) {
      const decade = Math.floor(year / 10) * 10;
      key = `${decade}s`;
    }
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(node);
  }

  // Sort group keys
  const groupKeys = Object.keys(groups).sort((a, b) => {
    if (a === 'Unknown') return 1;
    if (b === 'Unknown') return -1;
    const aVal = parseInt(a, 10);
    const bVal = parseInt(b, 10);
    return aVal - bVal;
  });

  const decadeKeys = groupKeys.filter(k => k !== 'Unknown');
  const N = decadeKeys.length;
  
  // Radius of the main ring
  const R = Math.max(340, N * 95);
  
  const clusterCenters: Record<string, Position> = {};
  
  for (let i = 0; i < N; i++) {
    const key = decadeKeys[i];
    const theta = (i / N) * 2 * Math.PI;
    clusterCenters[key] = {
      x: R * Math.cos(theta),
      y: R * Math.sin(theta)
    };
  }
  
  if (groups['Unknown']) {
    clusterCenters['Unknown'] = { x: 0, y: 0 };
  }

  for (const key of groupKeys) {
    const groupNodes = groups[key];
    const center = clusterCenters[key];
    
    groupNodes.sort((a, b) => {
      const yearA = a.data?.year || 0;
      const yearB = b.data?.year || 0;
      if (yearA !== yearB) return yearA - yearB;
      return a.title.localeCompare(b.title);
    });

    const M = groupNodes.length;
    if (M === 1) {
      positions[groupNodes[0].id] = { x: center.x, y: center.y };
    } else {
      const r = Math.max(90, M * 25);
      for (let j = 0; j < M; j++) {
        const node = groupNodes[j];
        const phi = (j / M) * 2 * Math.PI;
        positions[node.id] = {
          x: center.x + r * Math.cos(phi),
          y: center.y + r * Math.sin(phi)
        };
      }
    }
  }

  return positions;
}

// ── 3. Spiral Timeline Layout ───────────────────────────────────────────────
export function applySpiralLayout(nodes: Node[]): Record<string, Position> {
  const positions: Record<string, Position> = {};
  
  const sortedNodes = [...nodes].sort((a, b) => {
    const yearA = a.data?.year || 0;
    const yearB = b.data?.year || 0;
    if (yearA !== yearB) return yearA - yearB;
    return a.title.localeCompare(b.title);
  });

  const a = 42;
  const nodeSpacing = 190;

  for (let i = 0; i < sortedNodes.length; i++) {
    const node = sortedNodes[i];
    const s = i * nodeSpacing + 100;
    const theta = Math.sqrt((2 * s) / a);
    const r = a * theta;
    
    positions[node.id] = {
      x: r * Math.cos(theta),
      y: r * Math.sin(theta)
    };
  }

  return positions;
}
