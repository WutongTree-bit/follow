// 站点的字标和圆环标记：页面用 Wordmark 画标志和站名（size 是高度，单位像素），RingMark 是小标记，转起来就是加载动画。
// 标志是一只眼睛（观察）里的一根红色 K 线（券商）；颜色取主题的强调色和热点色，深浅色主题下自动跟着变。
import { SITE } from "../site.ts";

export function Wordmark({ size = 24, className = "", title = SITE.name }: { size?: number; className?: string; title?: string }) {
  // 站名较长时按字数缩小字号，让标志加站名在侧栏和手机顶栏里放得下、不换行。
  const em = [...SITE.name].length * 0.97 + 1.55;
  const fontSize = Math.round(size * Math.min(0.92, 5.5 / em));
  return (
    <span className={`inline-flex items-center whitespace-nowrap font-black leading-none tracking-[-0.03em] ${className}`} style={{ fontSize }} aria-label={title} role="img">
      <svg aria-hidden="true" focusable="false" viewBox="46 114 420 284" className="mr-[0.3em] h-[0.82em] w-auto shrink-0">
        <path d="M60 256C116 168 188 128 256 128S396 168 452 256C396 344 324 384 256 384S116 344 60 256Z" fill="none" strokeWidth="30" strokeLinejoin="round" style={{ stroke: "var(--accent)" }} />
        <path d="M256 168V344" fill="none" strokeWidth="20" strokeLinecap="round" style={{ stroke: "var(--hot)" }} />
        <rect x="214" y="204" width="84" height="110" rx="14" style={{ fill: "var(--hot)" }} />
      </svg>
      <span aria-hidden="true">{SITE.name}</span>
    </span>
  );
}

/** A ring with a dot; spinning, it is the loader. */
export function RingMark({ className = "", spinning = false }: { className?: string; spinning?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g style={spinning ? { transformOrigin: "12px 12px", animation: "spin-slow 1.1s linear infinite" } : undefined}>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="42 15" />
      </g>
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  );
}
