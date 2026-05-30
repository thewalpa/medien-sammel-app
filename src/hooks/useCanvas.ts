import { useReducer, useCallback } from 'react';
import type { CanvasState, Node, Edge, Position, Viewport, AppMode } from '../types';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const initialState: CanvasState = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodeId: null,
  connectingFromId: null,
  mode: 'pan',
};

type CanvasAction =
  | { type: 'LOAD_STATE'; payload: Partial<CanvasState> }
  | { type: 'ADD_NODE'; payload: Partial<Node> }
  | { type: 'MOVE_NODE'; payload: { id: string; position: Position } }
  | { type: 'UPDATE_NODE'; payload: { id: string; updates: Partial<Node> } }
  | { type: 'DELETE_NODE'; payload: string }
  | { type: 'ADD_EDGE'; payload: { source: string; target: string; label?: string } }
  | { type: 'DELETE_EDGE'; payload: string }
  | { type: 'SET_VIEWPORT'; payload: Viewport }
  | { type: 'SELECT_NODE'; payload: string | null }
  | { type: 'START_CONNECTING'; payload: string }
  | { type: 'FINISH_CONNECTING' }
  | { type: 'SET_MODE'; payload: AppMode }
  | { type: 'REORGANIZE_NODES'; payload: Record<string, Position> }
  | { type: 'CLEAR_SELECTION' };

function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'LOAD_STATE':
      return {
        ...state,
        nodes: action.payload.nodes || [],
        edges: action.payload.edges || [],
        viewport: action.payload.viewport || state.viewport,
      };
    case 'ADD_NODE': {
      const node: Node = {
        id: genId(),
        type: action.payload.type || 'generic',
        title: action.payload.title || 'Untitled',
        subtitle: action.payload.subtitle || '',
        imageUrl: action.payload.imageUrl || null,
        position: action.payload.position || { x: 0, y: 0 },
        data: action.payload.data || {},
        createdAt: new Date().toISOString(),
      };
      return { ...state, nodes: [...state.nodes, node], selectedNodeId: node.id };
    }
    case 'MOVE_NODE':
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === action.payload.id ? { ...n, position: action.payload.position } : n
        ),
      };
    case 'UPDATE_NODE':
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === action.payload.id ? { ...n, ...action.payload.updates } : n
        ),
      };
    case 'DELETE_NODE':
      return {
        ...state,
        nodes: state.nodes.filter((n) => n.id !== action.payload),
        edges: state.edges.filter(
          (e) => e.source !== action.payload && e.target !== action.payload
        ),
        selectedNodeId: state.selectedNodeId === action.payload ? null : state.selectedNodeId,
      };
    case 'ADD_EDGE': {
      const exists = state.edges.some(
        (e) =>
          (e.source === action.payload.source && e.target === action.payload.target) ||
          (e.source === action.payload.target && e.target === action.payload.source)
      );
      if (exists || action.payload.source === action.payload.target) return state;
      return {
        ...state,
        edges: [
          ...state.edges,
          {
            id: genId(),
            source: action.payload.source,
            target: action.payload.target,
            label: action.payload.label || '',
          },
        ],
      };
    }
    case 'DELETE_EDGE':
      return { ...state, edges: state.edges.filter((e) => e.id !== action.payload) };
    case 'SET_VIEWPORT':
      return { ...state, viewport: action.payload };
    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.payload };
    case 'START_CONNECTING':
      return { ...state, connectingFromId: action.payload, mode: 'connect' };
    case 'FINISH_CONNECTING':
      return { ...state, connectingFromId: null, mode: 'pan' };
    case 'SET_MODE':
      return {
        ...state,
        mode: action.payload,
        connectingFromId: action.payload === 'pan' ? null : state.connectingFromId,
      };
    case 'REORGANIZE_NODES':
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          action.payload[n.id] ? { ...n, position: action.payload[n.id] } : n
        ),
      };
    case 'CLEAR_SELECTION':
      return { ...state, selectedNodeId: null };
    default:
      return state;
  }
}

export function useCanvas() {
  const [state, dispatch] = useReducer(canvasReducer, initialState);

  const addNode = useCallback((payload: Partial<Node>) => dispatch({ type: 'ADD_NODE', payload }), []);
  const moveNode = useCallback(
    (id: string, position: Position) => dispatch({ type: 'MOVE_NODE', payload: { id, position } }),
    []
  );
  const updateNode = useCallback(
    (id: string, updates: Partial<Node>) => dispatch({ type: 'UPDATE_NODE', payload: { id, updates } }),
    []
  );
  const reorganizeNodes = useCallback(
    (positions: Record<string, Position>) => dispatch({ type: 'REORGANIZE_NODES', payload: positions }),
    []
  );
  const deleteNode = useCallback((id: string) => dispatch({ type: 'DELETE_NODE', payload: id }), []);
  const addEdge = useCallback(
    (source: string, target: string, label?: string) =>
      dispatch({ type: 'ADD_EDGE', payload: { source, target, label } }),
    []
  );
  const deleteEdge = useCallback((id: string) => dispatch({ type: 'DELETE_EDGE', payload: id }), []);
  const setViewport = useCallback(
    (viewport: Viewport) => dispatch({ type: 'SET_VIEWPORT', payload: viewport }),
    []
  );
  const selectNode = useCallback((id: string | null) => dispatch({ type: 'SELECT_NODE', payload: id }), []);
  const clearSelection = useCallback(() => dispatch({ type: 'CLEAR_SELECTION' }), []);
  const startConnecting = useCallback(
    (id: string) => dispatch({ type: 'START_CONNECTING', payload: id }),
    []
  );
  const finishConnecting = useCallback(() => dispatch({ type: 'FINISH_CONNECTING' }), []);
  const setMode = useCallback((mode: AppMode) => dispatch({ type: 'SET_MODE', payload: mode }), []);
  const loadState = useCallback(
    (data: Partial<CanvasState>) => dispatch({ type: 'LOAD_STATE', payload: data }),
    []
  );

  return {
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
  };
}
