export interface Position {
  x: number;
  y: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Node {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  position: Position;
  data: Record<string, any>;
  createdAt: string;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export type AppMode = 'pan' | 'connect';

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  selectedNodeId: string | null;
  connectingFromId: string | null;
  mode: AppMode;
}

export interface MediaItem {
  id: string;
  type: 'movie' | 'book' | 'music' | 'art';
  title: string;
  subtitle: string;
  imageUrl: string | null;
  data: Record<string, any>;
}

export interface ThemeState {
  themeId: string;
  bgId: string;
  customBgUrl: string | null;
  changeTheme: (id: string) => void;
  changeBg: (id: string) => void;
  changeCustomBg: (url: string) => void;
}
