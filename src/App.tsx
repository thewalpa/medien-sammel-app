import React, { useState, useCallback, useMemo } from 'react';
import type { Node } from './types';
import Canvas from './canvas/Canvas';
import Toolbar from './components/Toolbar';
import MediaSearchModal from './components/MediaSearchModal';
import NodeDetailPanel from './components/NodeDetailPanel';
import EdgeDetailModal from './components/EdgeDetailModal';
import MediaSidebar from './components/MediaSidebar';
import ThemeCustomizer from './components/ThemeCustomizer';
import LayoutModal from './components/LayoutModal';
import OfflineBanner from './components/OfflineBanner';
import InstallBanner from './components/InstallBanner';
import { useCanvas } from './hooks/useCanvas';
import { usePersistence } from './hooks/usePersistence';
import { useTheme } from './hooks/useTheme';
import { useMediaSearch } from './hooks/useMediaSearch';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { screenToCanvas } from './canvas/canvasUtils';
import { applyDecadeClustering } from './utils/layout';
import type { LayoutStrategy } from './utils/layout';

export default function App() {
  const {
    state,
    addNode,
    moveNode,
    updateNode,
    reorganizeNodes,
    deleteNode,
    addEdge,
    deleteEdge,
    setViewport,
    selectNode,
    clearSelection,
    startConnecting,
    finishConnecting,
    setMode,
    loadState,
  } = useCanvas();

  const theme = useTheme();
  const mediaSearch = useMediaSearch();
  const { canInstall, promptInstall, dismiss } = useInstallPrompt();
  usePersistence(state, loadState);

  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Selected node object
  const selectedNode = useMemo(() => {
    if (!state.selectedNodeId) return null;
    return state.nodes.find((n) => n.id === state.selectedNodeId) || null;
  }, [state.selectedNodeId, state.nodes]);

  // Selected edge object and its nodes
  const selectedEdge = useMemo(() => {
    if (!selectedEdgeId) return null;
    return state.edges.find((e) => e.id === selectedEdgeId) || null;
  }, [selectedEdgeId, state.edges]);

  const edgeNodes = useMemo(() => {
    if (!selectedEdge) return { source: null, target: null };
    const source = state.nodes.find((n) => n.id === selectedEdge.source) || null;
    const target = state.nodes.find((n) => n.id === selectedEdge.target) || null;
    return { source, target };
  }, [selectedEdge, state.nodes]);

  // Add node at center of viewport
  const handleAddNode = useCallback(
    (payload: Partial<Node>) => {
      // Calculate center of current viewport
      const centerScreen = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const canvasPos = screenToCanvas(centerScreen, state.viewport);
      // Offset slightly randomly so multiple adds don't stack perfectly
      const offset = {
        x: (Math.random() - 0.5) * 100,
        y: (Math.random() - 0.5) * 100,
      };
      addNode({
        ...payload,
        position: {
          x: canvasPos.x + offset.x - 60,
          y: canvasPos.y + offset.y - 70,
        },
      });
    },
    [addNode, state.viewport]
  );

  const handleApplyLayout = useCallback((strategy: LayoutStrategy) => {
    if (state.nodes.length === 0) return;
    let positions: Record<string, { x: number; y: number }> = {};
    
    if (strategy === 'decade') {
      positions = applyDecadeClustering(state.nodes);
    }
    
    reorganizeNodes(positions);
    
    // Center the viewport on the new bounding box
    const nodeIds = Object.keys(positions);
    if (nodeIds.length > 0) {
      const xs = nodeIds.map(id => positions[id].x);
      const ys = nodeIds.map(id => positions[id].y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs) + 120; // Node width is 120px
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys) + 160; // Approximate node height
      
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      
      const zoom = state.viewport.zoom;
      setViewport({
        x: window.innerWidth / 2 - centerX * zoom,
        y: window.innerHeight / 2 - centerY * zoom,
        zoom,
      });
    }
  }, [state.nodes, state.viewport.zoom, reorganizeNodes, setViewport]);

  // Navigation Logic
  const handleFocusNode = useCallback(
    (id: string) => {
      const node = state.nodes.find((n) => n.id === id);
      if (node) {
        const zoom = state.viewport.zoom;
        setViewport({
          x: window.innerWidth / 2 - (node.position.x + 60) * zoom,
          y: window.innerHeight / 2 - (node.position.y + 70) * zoom,
          zoom,
        });
        selectNode(id);
        setSidebarOpen(false);
      }
    },
    [state.nodes, state.viewport.zoom, setViewport, selectNode]
  );

  // Handle connecting
  const handleNodeSelect = useCallback(
    (id: string) => {
      if (state.connectingFromId && id !== state.connectingFromId) {
        addEdge(state.connectingFromId, id);
        finishConnecting();
      } else {
        selectNode(id);
      }
    },
    [state.connectingFromId, addEdge, finishConnecting, selectNode]
  );

  const handleStartConnect = useCallback(
    (id: string) => {
      startConnecting(id);
    },
    [startConnecting]
  );

  const handleFinishConnect = useCallback(
    (targetId?: string) => {
      if (state.connectingFromId && targetId && targetId !== state.connectingFromId) {
        addEdge(state.connectingFromId, targetId);
      }
      finishConnecting();
    },
    [state.connectingFromId, addEdge, finishConnecting]
  );

  const handleToggleConnect = useCallback(() => {
    if (state.mode === 'connect') {
      setMode('pan');
    } else {
      if (state.selectedNodeId) {
        startConnecting(state.selectedNodeId);
      } else {
        // Prompt user to double-tap a node
        setMode('connect');
      }
    }
  }, [state.mode, state.selectedNodeId, setMode, startConnecting]);

  const handleClearSelection = useCallback(() => {
    clearSelection();
    setSelectedEdgeId(null);
  }, [clearSelection]);

  const handleSelectEdge = useCallback(
    (edgeId: string) => {
      setSelectedEdgeId(edgeId);
      clearSelection(); // Deselect node if edge is clicked
    },
    [clearSelection]
  );

  return (
    <div className="app-root">
      {!sidebarOpen && (
        <button
          className="sidebar-toggle-btn glass"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title="Media Library"
          id="btn-sidebar-floating"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      <Canvas
        nodes={state.nodes}
        edges={state.edges}
        viewport={state.viewport}
        selectedNodeId={state.selectedNodeId}
        connectingFromId={state.connectingFromId}
        mode={state.mode}
        onSetViewport={setViewport}
        onMoveNode={moveNode}
        onSelectNode={handleNodeSelect}
        onClearSelection={handleClearSelection}
        onStartConnect={handleStartConnect}
        onFinishConnect={handleFinishConnect}
        onSelectEdge={handleSelectEdge}
        selectedEdgeId={selectedEdgeId}
      />

      <MediaSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        nodes={state.nodes}
        selectedNodeId={state.selectedNodeId}
        onFocusNode={handleFocusNode}
      />

      {state.mode === 'connect' && (
        <div
          style={{
            position: 'fixed',
            top: 'calc(16px + var(--safe-top))',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 20px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--accent)',
            color: 'var(--text-inverse)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-bold)',
            zIndex: 'var(--z-toolbar)' as any,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {state.connectingFromId ? 'Tap another node to connect' : 'Double-tap a node to start connecting'}
        </div>
      )}

      {selectedNode && !searchOpen && !settingsOpen && !selectedEdgeId && (
        <NodeDetailPanel
          node={selectedNode}
          onClose={clearSelection}
          onDelete={deleteNode}
          onStartConnect={handleStartConnect}
          onUpdate={updateNode}
        />
      )}

      {selectedEdge && (
        <EdgeDetailModal
          edge={selectedEdge}
          sourceNode={edgeNodes.source}
          targetNode={edgeNodes.target}
          onClose={() => setSelectedEdgeId(null)}
          onDelete={deleteEdge}
        />
      )}

      <Toolbar
        mode={state.mode}
        connectingFromId={state.connectingFromId}
        onAddMedia={() => setSearchOpen(true)}
        onToggleConnect={handleToggleConnect}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenLayout={() => setLayoutOpen(true)}
      />

      <MediaSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onAddNode={handleAddNode}
        mediaSearch={mediaSearch}
      />

      <LayoutModal
        open={layoutOpen}
        onClose={() => setLayoutOpen(false)}
        onApplyLayout={handleApplyLayout}
        nodeCount={state.nodes.length}
      />

      <ThemeCustomizer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        themeId={theme.themeId}
        bgId={theme.bgId}
        customBgUrl={theme.customBgUrl}
        onChangeTheme={theme.changeTheme}
        onChangeBg={theme.changeBg}
        onChangeCustomBg={theme.changeCustomBg}
      />

      <InstallBanner canInstall={canInstall} onInstall={promptInstall} onDismiss={dismiss} />
      <OfflineBanner />
    </div>
  );
}
