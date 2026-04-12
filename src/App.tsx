import React, { useState, useCallback, useMemo } from 'react';
import type { Node } from './types';
import Canvas from './canvas/Canvas';
import Toolbar from './components/Toolbar';
import MediaSearchModal from './components/MediaSearchModal';
import NodeDetailPanel from './components/NodeDetailPanel';
import EdgeDetailModal from './components/EdgeDetailModal';
import ThemeCustomizer from './components/ThemeCustomizer';
import OfflineBanner from './components/OfflineBanner';
import InstallBanner from './components/InstallBanner';
import { useCanvas } from './hooks/useCanvas';
import { usePersistence } from './hooks/usePersistence';
import { useTheme } from './hooks/useTheme';
import { useMediaSearch } from './hooks/useMediaSearch';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { screenToCanvas } from './canvas/canvasUtils';

export default function App() {
  const {
    state,
    addNode,
    moveNode,
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
      />

      <MediaSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onAddNode={handleAddNode}
        mediaSearch={mediaSearch}
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
