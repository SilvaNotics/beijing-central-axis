/** Angular lattice and stepped bracket forms inspired by timber windows and dougong. */
export default function OrnamentalFrame({ variant = 'scene' }: { variant?: 'scene' | 'panel' }) {
  return <div className={`ornamental-frame ornamental-${variant}`} aria-hidden="true">
    <span className="ornamental-rule ornamental-rule-top" /><span className="ornamental-rule ornamental-rule-bottom" />
    {['tl', 'tr', 'bl', 'br'].map(corner => <svg className={`ornamental-corner ornamental-${corner}`} key={corner} viewBox="0 0 64 64" fill="none">
      <path className="wire-gold" d="M1 63V1h62M7 53V7h46M13 37V13h24" />
      <path className="wire-blue" d="M1 48h19V20h28V1M7 42h7V14h28V7" />
      <path className="wire-gold" d="M21 35v-7h7v-7h7v7h7v7h-7v7h-7v-7h-7ZM21 1v6m14-6v6M1 21h6M1 35h6" />
      <path className="wire-blue" d="M43 15h12v12H43ZM15 43h12v12H15Z" />
    </svg>)}
  </div>;
}
