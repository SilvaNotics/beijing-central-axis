import type { RegionId } from '../data/types';
export interface SceneViewProps {
  active?: boolean;
  viewRevision?: number;
  selection: string | null;
  focus: RegionId | 'all';
  sample?: boolean;
  quality: 'cinematic' | 'balanced';
  onSelect: (id: string) => void;
  onReady?: (state: 'ready' | 'fallback') => void;
}
