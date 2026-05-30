import type { Node, Position } from '../types';

export type LayoutStrategy = 'decade';

export function applyDecadeClustering(nodes: Node[]): Record<string, Position> {
  const positions: Record<string, Position> = {};
  
  // 1. Group nodes by decade
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

  // 2. Sort group keys (decades chronologically, then 'Unknown' at the end)
  const groupKeys = Object.keys(groups).sort((a, b) => {
    if (a === 'Unknown') return 1;
    if (b === 'Unknown') return -1;
    const aVal = parseInt(a, 10);
    const bVal = parseInt(b, 10);
    return aVal - bVal;
  });

  // 3. Position nodes in each group
  const NODE_X_SPACING = 150;    // Horizontal spacing inside a 2-column grid
  const NODE_Y_SPACING = 210;    // Vertical spacing between rows

  let currentClusterX = 0;

  for (const key of groupKeys) {
    const groupNodes = groups[key];
    // Sort nodes within the same decade by year, then title
    groupNodes.sort((a, b) => {
      const yearA = a.data?.year || 0;
      const yearB = b.data?.year || 0;
      if (yearA !== yearB) return yearA - yearB;
      return a.title.localeCompare(b.title);
    });

    const cols = groupNodes.length > 1 ? 2 : 1; // 1 or 2 columns based on size
    
    for (let i = 0; i < groupNodes.length; i++) {
      const node = groupNodes[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      const x = currentClusterX + col * NODE_X_SPACING;
      const y = row * NODE_Y_SPACING;
      
      positions[node.id] = { x, y };
    }

    // Move the column start offset for the next cluster.
    currentClusterX += cols * NODE_X_SPACING + 160; 
  }

  return positions;
}
