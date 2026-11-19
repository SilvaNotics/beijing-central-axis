import { useEffect, useRef } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { landmarks, regions, sources } from '../data/heritage';

type Props = { mode: 'catalog' | 'about' | null; onClose: () => void; onSelect: (id: string) => void };
export default function AtlasDialog({ mode, onClose, onSelect }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (mode && element && !element.open) element.showModal();
    if (!mode && element?.open) element.close();
  }, [mode]);
  return <dialog ref={dialog} className="atlas-dialog" onClose={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialog-content">
      <header className="dialog-header"><div><span className="eyebrow">{mode === 'catalog' ? 'THE HERITAGE COLLECTION' : 'ABOUT THIS ATLAS'}</span><h2>{mode === 'catalog' ? '沿轴拾遗' : '关于这幅长卷'}</h2></div><button className="icon-button" aria-label="关闭对话框" onClick={onClose}><X size={20} /></button></header>
      {mode === 'catalog' ? <><p className="dialog-intro">从钟鼓楼到永定门，循十五处遗产构成要素，读一座城的秩序。</p>{regions.map(region => <section className="catalog-region" key={region.id}><h3>{region.title} <small>{region.subtitle}</small></h3><ul>{landmarks.filter(site => site.region === region.id).map(site => <li key={site.id}><button onClick={() => { onSelect(site.id); onClose(); }}><span>{site.name}<small>{site.enName}</small></span><span>{site.era}<ArrowUpRight size={16} /></span></button></li>)}</ul></section>)}</> : <>
        <p className="dialog-intro">北京中轴线，是一条城市的脊梁，也是一部仍在生长的历史。</p>
        <p>这幅数字长卷以真实地理位置为基础，将中轴线的空间秩序转译为可探索的三维图景。建筑体量、屋顶与植被经过艺术化概括，周边城市肌理为示意，并非测绘模型或文物复原成果。</p>
        <p>点击遗产地标，了解历史；选择北、中、南段，让视线沿轴移动；进入篇章，继续深入各段的独立体验。</p>
        <div className="about-stat"><span>7.8<small>公里 / 轴线长度</small></span><span>15<small>处 / 遗产构成要素</small></span><span>2024<small>年 / 列入世界遗产</small></span></div>
        <h3 className="source-title">资料与地理依据</h3><ul className="source-list">{sources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ArrowUpRight size={15} /></a><p>{source.note}</p></li>)}</ul>
        <p className="small-note">背景音乐《Ripples》由 Kevin MacLeod（incompetech.com）创作，依 CC BY 4.0 授权使用；界面音效取 CC0 / 公有领域素材；游览播报为本站自制的语音合成文件（Microsoft Edge TTS 神经网络语音），仅用于本课程的演示与学习，不作商业用途。信息供文化探索与学习参考，开放时间与参观安排请以各场馆官方公告为准。</p>
      </>}
    </div>
  </dialog>;
}
