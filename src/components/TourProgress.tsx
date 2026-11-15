import { X } from 'lucide-react';
import type { TourMode, TourStatus } from '../scene/axisTour';

export default function TourProgress({ mode, status, onStop }: { mode: TourMode; status: TourStatus | null; onStop: () => void }) {
  if (mode === 'off') return null;
  return <aside className="tour-progress" aria-label="由南至北游览进度">
    <div className="tour-heading"><span>南 → 北 · {mode === 'paused' ? '已暂停' : mode === 'complete' ? '游览完成' : '循轴游览'}</span><button onClick={onStop} aria-label="结束游览" title="结束游览 · Esc"><X size={16} /></button></div>
    <p role="status">{status?.name ?? '永定门'}<small>{status ? `${status.index} / ${status.total}` : ''}</small></p>
    <progress max={100} value={status?.progress ?? 0} aria-label="游览路线进度" />
    <small>固定视角平移 · 拖动或滚轮可接管</small>
  </aside>;
}
