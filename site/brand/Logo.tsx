// 观察镜头与行业数据柱：页面和静态品牌资源共用同一份图形。
import { SITE } from "../site.ts";
import { BRAND_MARK } from "./mark.ts";

export function Wordmark({ size = 24, className = "", title = SITE.name }: { size?: number; className?: string; title?: string }) {
  // 站名较长时按字数缩小字号，让标志加站名在侧栏和手机顶栏里放得下、不换行。
  const em = [...SITE.name].length * 0.97 + 1.55;
  const fontSize = Math.round(size * Math.min(0.92, 5.5 / em));
  return (
    <span className={`inline-flex items-center whitespace-nowrap font-black leading-none tracking-[-0.03em] ${className}`} style={{ fontSize }} aria-label={title} role="img">
      <svg aria-hidden="true" focusable="false" viewBox="72 72 368 368" className="mr-[0.3em] h-[1.15em] w-auto shrink-0">
        <path d={BRAND_MARK.ring} fill="none" strokeWidth="28" strokeLinecap="round" style={{ stroke: "var(--accent)" }} />
        <circle {...BRAND_MARK.dot} style={{ fill: "var(--hot)" }} />
        {BRAND_MARK.bars.map((bar, i) => (
          <rect key={bar.x} {...bar} style={{ fill: i === 2 ? "var(--hot)" : "var(--accent)" }} />
        ))}
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
