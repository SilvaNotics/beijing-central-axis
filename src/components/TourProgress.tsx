import { useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Pause, Play, RotateCcw, X } from 'lucide-react';
import type { TourMode, TourStatus } from '../scene/axisTour';

interface Props {
  mode: TourMode;
  status: TourStatus | null;
  /** 每一站开始停留的绝对毫秒，和场景里的游览时间表同源。 */
  starts: number[];
  /** 站名，竖轴悬停和吸附时用。 */
  stops: { name: string; en: string }[];
  total: number;
  onSeekRatio: (ratio: number) => void;
  onStep: (delta: number) => void;
  onToggle: () => void;
  onStop: () => void;
  onRestart: () => void;
  /** 讲解模式：开关开着时每站名字后面多念一句。 */
  brief: boolean;
  onBrief: () => void;
}

export default function TourProgress({ mode, status, starts, stops, total, onSeekRatio, onStep, onToggle, onStop, onRestart, brief, onBrief }: Props) {
  const count = starts.length;
  const rail = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  if (mode === 'off') return null;

  const ratio = Math.max(0, Math.min(1, (status?.progress ?? 0) / 100));
  /** 松手/按下落在哪一站：取时间表里离得最近的那一站，不再按像素自由定位。 */
  const stationAt = (clientY: number) => {
    const box = rail.current?.getBoundingClientRect();
    if (!box || !box.height || !total) return null;
    const wanted = (box.bottom - clientY) / box.height;
    let best = 0, gap = Infinity;
    starts.forEach((ms, index) => {
      const at = ms / total, d = Math.abs(at - wanted);
      if (d < gap) { gap = d; best = index; }
    });
    return best;
  };
  /** 竖轴：南在下、北在上，和真实方位一致；吸附到最近一站，拖动不会停在两站之间。 */
  const seekTo = (clientY: number) => {
    const index = stationAt(clientY);
    if (index === null) return;
    seekStation(index);
    setHover(index);
  };
  const seekStation = (index: number) => onSeekRatio(Math.max(0, Math.min(1, starts[index] / total)));

  return <aside className="tour-progress" aria-label="由南至北游览进度">
    <div className="tour-heading">
      <span>{mode === 'paused' ? '已暂停' : mode === 'complete' ? '游览完成' : '循轴游览'}</span>
      <b className="tour-count">{status ? `${status.index} / ${status.total}` : ''}</b>
      <button onClick={onStop} aria-label="结束游览" title="结束游览 · Esc"><X size={16} /></button>
    </div>

    <div className="tour-who" role="status" aria-live="polite">
      <p className="tour-current-stop"><strong>{status?.name ?? '永定门'}</strong></p>
      <p className="tour-english">{status?.en ?? 'Yongdingmen Gate'}</p>
      {status?.phase === 'travel' && status.next && (
        <p className="tour-next">前往 {status.next.name} <span aria-hidden="true">→</span></p>
      )}
    </div>

    <div className="tour-body">
      <div
        className={`tour-vrail${dragging ? ' is-dragging' : ''}`}
        ref={rail}
        role="slider"
        tabIndex={0}
        aria-label="游览路线进度，可上下拖动"
        aria-orientation="vertical"
        aria-valuemin={1}
        aria-valuemax={count}
        aria-valuenow={status?.index ?? 1}
        aria-valuetext={status ? `第 ${status.index} 站 · ${status.name}` : undefined}
        onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); setDragging(true); seekTo(event.clientY); }}
        onPointerMove={event => { if (dragging) seekTo(event.clientY); else setHover(stationAt(event.clientY)); }}
        onPointerUp={() => { setDragging(false); setHover(null); }}
        onPointerCancel={() => { setDragging(false); setHover(null); }}
        onPointerLeave={() => { if (!dragging) setHover(null); }}
      >
        <span className="tour-vrail-pole" aria-hidden="true" />
        <i className="tour-vrail-fill" style={{ height: `${ratio * 100}%` }} />
        <span className="tour-vrail-head" style={{ bottom: `${ratio * 100}%` }} />
        <span className="tour-vrail-ticks" aria-hidden="true">
          {starts.map((ms, index) => (
            <b
              key={index}
              style={{ bottom: `${total > 0 ? Math.min(100, ms / total * 100) : 0}%` }}
              className={[status && index + 1 <= status.index ? 'is-past' : '', index % 5 === 0 ? 'is-major' : ''].filter(Boolean).join(' ')}
              title={`第 ${index + 1} 站 · ${stops[index]?.name ?? ''}`}
            />
          ))}
        </span>
        {hover !== null && stops[hover] && (
          <span className="tour-vrail-tip" style={{ bottom: `${total > 0 ? Math.min(96, starts[hover] / total * 100) : 0}%` }}>
            {stops[hover].name}
          </span>
        )}
        <span className="tour-vrail-north" aria-hidden="true">北</span>
        <span className="tour-vrail-south" aria-hidden="true">南</span>
      </div>

      <div className="tour-side">
        {mode === 'complete'
          ? <div className="tour-done">
              <button onClick={onRestart} title="回到第一站重新游览"><RotateCcw size={13} />再看一遍</button>
              <button onClick={onStop} title="结束游览">结束</button>
            </div>
          : <div className="tour-nav">
              <button onClick={() => onStep(-1)} title="上一站 · ←"><ChevronUp size={13} />上一站</button>
              <button className="is-primary" onClick={onToggle} aria-label={mode === 'playing' ? '暂停游览' : '继续游览'} title="暂停 / 继续 · 空格">{mode === 'playing' ? <><Pause size={13} />暂停</> : <><Play size={13} />继续</>}</button>
              <button onClick={() => onStep(1)} title="下一站 · →"><ChevronDown size={13} />下一站</button>
              {/* 讲解放进按钮列：塞标题栏会把「循轴游览」挤成两行，单独一行又会把竖屏面板撑高 */}
              <button
                className={`tour-brief${brief ? ' is-on' : ''}`}
                aria-pressed={brief}
                onClick={onBrief}
                title={brief ? '关掉讲解，只念站名' : '开着讲解，每到一站多讲一句'}
              ><span className="tour-brief-dot" aria-hidden="true" />讲解<em>{brief ? '开' : '关'}</em></button>
            </div>}
        <small>拖动画面结束游览<br />拖左边竖轴跳站</small>
      </div>
    </div>
  </aside>;
}
