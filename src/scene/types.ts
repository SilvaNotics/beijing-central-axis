import type { RegionId } from '../data/types';
import type { TourMode, TourStatus } from './axisTour';
export interface SceneViewProps {
  active?: boolean;
  viewRevision?: number;
  selection: string | null;
  focus: RegionId | 'all';
  sample?: boolean;
  quality: 'cinematic' | 'balanced';
  rotateMode?: boolean;
  tourMode?: TourMode;
  onTourModeChange?: (mode: TourMode) => void;
  onTourStatus?: (status: TourStatus) => void;
  onSelect: (id: string) => void;
  onReady?: (state: 'ready' | 'fallback') => void;
  onBearingChange?: (degrees: number) => void;
}
