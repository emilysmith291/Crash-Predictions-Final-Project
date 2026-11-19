// Simple side-view vehicles and road scenes, drawn as inline SVG and moved
// with CSS animations (see globals.css). Decorative only: hidden from screen
// readers, and frozen when the visitor prefers reduced motion.
import { cn } from "@/lib/utils";

type Kind = "sedan" | "suv" | "truck" | "motorcycle";

const WHEEL = "#1f2430";
const HUB = "#cbd2dc";
const GLASS = "#dbe8f7";

function Wheel({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g className="anim-wheel">
      <circle cx={cx} cy={cy} r={r} fill={WHEEL} />
      <circle cx={cx} cy={cy} r={r * 0.42} fill={HUB} />
      <rect x={cx - 0.8} y={cy - r * 0.8} width={1.6} height={r * 0.5} fill={WHEEL} />
    </g>
  );
}

export function Vehicle({ kind, color, className }: { kind: Kind; color: string; className?: string }) {
  if (kind === "motorcycle") {
    return (
      <svg viewBox="0 0 80 50" className={className}>
        <path d="M14 38 L32 26 H50 L64 38" stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M30 26 L36 18 H48 L52 26 Z" fill={color} />
        <circle cx="44" cy="8" r="5" fill="#2b313b" />
        <path d="M43 13 L40 24" stroke="#2b313b" strokeWidth="5" strokeLinecap="round" />
        <Wheel cx={14} cy={38} r={10} />
        <Wheel cx={64} cy={38} r={10} />
      </svg>
    );
  }
  if (kind === "truck") {
    return (
      <svg viewBox="0 0 170 60" className={className}>
        <rect x="4" y="6" width="112" height="38" rx="3" fill={color} />
        <path d="M120 16 H146 L162 30 V44 H120 Z" fill={color} />
        <path d="M126 20 H144 L155 30 H126 Z" fill={GLASS} />
        <rect x="4" y="40" width="160" height="6" rx="2" fill="#3a414d" />
        <Wheel cx={26} cy={48} r={9} />
        <Wheel cx={48} cy={48} r={9} />
        <Wheel cx={142} cy={48} r={9} />
      </svg>
    );
  }
  const suv = kind === "suv";
  return (
    <svg viewBox="0 0 120 50" className={className}>
      <path d={suv ? "M24 22 L32 5 H90 L100 22 Z" : "M30 22 L43 8 H80 L95 22 Z"} fill={color} />
      <path d={suv ? "M36 20 L41 9 H62 V20 Z" : "M38 20 L46 11 H61 V20 Z"} fill={GLASS} />
      <path d={suv ? "M66 20 V9 H86 L93 20 Z" : "M65 20 V11 H78 L88 20 Z"} fill={GLASS} />
      <rect x="4" y="21" width="112" height="17" rx="7" fill={color} />
      <rect x="108" y="25" width="6" height="4" rx="1.5" fill="#fde68a" />
      <Wheel cx={30} cy={38} r={8.5} />
      <Wheel cx={90} cy={38} r={8.5} />
    </svg>
  );
}

const TRAFFIC: { kind: Kind; color: string; lane: "top" | "bottom"; seconds: number; delay: number; w: number }[] = [
  { kind: "sedan", color: "#1d4ed8", lane: "bottom", seconds: 9, delay: 0, w: 92 },
  { kind: "truck", color: "#94a3b8", lane: "top", seconds: 14, delay: -4, w: 130 },
  { kind: "motorcycle", color: "#c2410c", lane: "bottom", seconds: 7, delay: -5, w: 52 },
  { kind: "suv", color: "#475569", lane: "top", seconds: 10, delay: -9, w: 96 },
  { kind: "sedan", color: "#0f766e", lane: "bottom", seconds: 11, delay: -8, w: 88 },
];

/** Header scene: two lanes of traffic driving in opposite directions. */
export function RoadScene({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative h-28 overflow-hidden rounded-xl", className)}
         style={{ background: "linear-gradient(180deg, #e8eef7 0%, #f3f6fa 55%, #f6f7f9 100%)" }}>
      {/* road */}
      <div className="absolute inset-x-0 bottom-3 h-[68px] bg-[#2b313b]">
        <div className="lane-dashes absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2" />
        <div className="absolute inset-x-0 top-1 h-px bg-white/30" />
        <div className="absolute inset-x-0 bottom-1 h-px bg-white/30" />
      </div>
      {TRAFFIC.map((v, i) => (
        <div
          key={i}
          className={cn("absolute", v.lane === "bottom" ? "anim-drive-right bottom-[16px]" : "anim-drive-left bottom-[47px]")}
          style={{ width: v.w, animationDuration: `${v.seconds}s`, animationDelay: `${v.delay}s` }}
        >
          <Vehicle kind={v.kind} color={v.color} className={cn("w-full", v.lane === "top" && "-scale-x-100")} />
        </div>
      ))}
    </div>
  );
}

/** Loading state: one car driving in place while the road scrolls under it. */
export function DrivingLoader({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-4">
      <div aria-hidden className="relative h-20 w-full max-w-xs overflow-hidden rounded-lg bg-[#2b313b]">
        <div className="lane-dashes anim-lane absolute inset-x-0 bottom-4 h-[3px]" />
        <div className="anim-bob absolute bottom-6 left-1/2 w-24 -translate-x-1/2">
          <Vehicle kind="sedan" color="#3b82f6" className="w-full" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
