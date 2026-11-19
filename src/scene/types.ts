import type { CityLoadProgress } from './city';
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
  /** 讲解模式：每到一站名字后面再念一句（音源 NN-brief.mp3，时长计入站点停靠）。 */
  brief?: boolean;
  /** 游览指令（跳站/上一站下一站），换 rev 才会执行一次。 */
  tourCommand?: { rev: number; type: 'seek' | 'step'; value: number } | null;
  onTourModeChange?: (mode: TourMode) => void;
  onTourStatus?: (status: TourStatus) => void;
  onSelect: (id: string) => void;
  onReady?: (state: 'ready' | 'fallback') => void;
  onLoadProgress?: (progress: CityLoadProgress) => void;
  onBearingChange?: (degrees: number) => void;
}
