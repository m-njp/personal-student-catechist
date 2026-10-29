import { giftColor, WORKER_GIFTS } from "../cast";
import { INK, paper } from "./paper";

/** Thin ink for small details on paper, such as window frames and wood grain. */
export const detail = { stroke: INK, strokeWidth: 2, strokeLinejoin: "round", strokeLinecap: "round", fill: "none" } as const;

/** A five-pointed star centered on 0,0. */
function starPath(r: number): string {
  const points = Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    return `${(Math.cos(angle) * radius).toFixed(1)} ${(Math.sin(angle) * radius).toFixed(1)}`;
  });
  return `M${points.join(" L")} Z`;
}

export function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={paper("cloud")}>
      <ellipse cx="0" cy="20" rx="90" ry="30" />
      <circle cx="-35" cy="5" r="34" />
      <circle cx="15" cy="-8" r="44" />
      <circle cx="55" cy="10" r="30" />
    </g>
  );
}

/** A capiz window: a wooden frame of small, pearly shell panes, as in old Filipino houses and schools. */
export function CapizWindow({
  x,
  y,
  w,
  h,
  cols = 3,
  rows = 4,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  cols?: number;
  rows?: number;
}) {
  const pad = 8;
  const cellW = (w - pad * 2) / cols;
  const cellH = (h - pad * 2) / rows;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="4" fill={paper("frame")} />
      {Array.from({ length: cols * rows }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return (
          <rect
            key={i}
            x={x + pad + col * cellW + 2}
            y={y + pad + row * cellH + 2}
            width={cellW - 4}
            height={cellH - 4}
            rx="2"
            fill={paper("capiz")}
          />
        );
      })}
      <line x1={x + w / 2} y1={y + 4} x2={x + w / 2} y2={y + h - 4} stroke={paper("frame")} strokeWidth="5" />
    </g>
  );
}

/** A flag pole. `x` and `y` are its foot. */
export function FlagPole({ x, y, height }: { x: number; y: number; height: number }) {
  return (
    <g>
      <rect x={x - 26} y={y - 18} width="52" height="22" rx="4" fill={paper("stone-dark")} />
      <rect x={x - 6} y={y - height} width="12" height={height} rx="5" fill={paper("stone")} />
      <circle cx={x} cy={y - height} r="10" fill={paper("gold")} />
    </g>
  );
}

/** The Philippine flag, its left edge at x, y. It waves on its own, so it is drawn apart from the pole. */
export function PhFlag({ x, y }: { x: number; y: number }) {
  const w = 210;
  const h = 105;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h / 2} fill={paper("flag-blue")} />
      <rect x={x} y={y + h / 2} width={w} height={h / 2} fill={paper("flag-red")} />
      <path d={`M${x} ${y} L${x + h * 0.87} ${y + h / 2} L${x} ${y + h} Z`} fill={paper("white")} />
      <g transform={`translate(${x + 30} ${y + h / 2})`} fill={paper("flag-yellow")}>
        <circle r="11" />
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x="-2" y="-21" width="4" height="8" transform={`rotate(${i * 45})`} />
        ))}
      </g>
      <path d={starPath(6)} transform={`translate(${x + 9} ${y + 12})`} fill={paper("flag-yellow")} />
      <path d={starPath(6)} transform={`translate(${x + 9} ${y + h - 12})`} fill={paper("flag-yellow")} />
      <path d={starPath(6)} transform={`translate(${x + h * 0.72} ${y + h / 2})`} fill={paper("flag-yellow")} />
    </g>
  );
}

/** Two birds in flight, at x, y. */
export function Birds({ x, y }: { x: number; y: number }) {
  return (
    <g fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${x} ${y} Q${x + 10} ${y - 10} ${x + 20} ${y} Q${x + 30} ${y - 10} ${x + 40} ${y}`} />
      <path d={`M${x + 30} ${y + 18} Q${x + 37} ${y + 11} ${x + 44} ${y + 18} Q${x + 51} ${y + 11} ${x + 58} ${y + 18}`} />
    </g>
  );
}

/** A mango tree with ripe fruit. `x` and `y` are the foot of the trunk. */
export function MangoTree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        d="M-26 0 L-18 -170 Q-40 -200 -70 -215 L-58 -228 Q-24 -212 -6 -190 Q6 -230 30 -250 L42 -238 Q22 -214 16 -176 L26 0 Z"
        fill={paper("trunk")}
      />
      <g fill={paper("leaf-dark")}>
        <circle cx="-110" cy="-250" r="80" />
        <circle cx="105" cy="-255" r="85" />
        <circle cx="0" cy="-330" r="100" />
      </g>
      <g fill={paper("leaf")}>
        <circle cx="-60" cy="-300" r="78" />
        <circle cx="60" cy="-305" r="80" />
        <circle cx="-5" cy="-235" r="70" />
      </g>
      <g fill={paper("sun")}>
        {[
          [-80, -230],
          [40, -220],
          [95, -280],
          [-30, -290],
          [-120, -270],
          [10, -360],
        ].map(([mx, my]) => (
          <ellipse key={`${mx}${my}`} cx={mx} cy={my} rx="11" ry="16" transform={`rotate(-20 ${mx} ${my})`} />
        ))}
      </g>
    </g>
  );
}

/** A string of banderitas, the small fiesta flags, hanging from x1 to x2 with a gentle sag. */
export function Banderitas({ x1, x2, y, sag, count }: { x1: number; x2: number; y: number; sag: number; count: number }) {
  const colors = [...WORKER_GIFTS.map(giftColor), giftColor("teaching"), giftColor("praying")];
  const at = (t: number) => ({ x: x1 + (x2 - x1) * t, y: y + sag * 4 * t * (1 - t) });
  return (
    <g>
      <path d={`M${x1} ${y} Q${(x1 + x2) / 2} ${y + sag * 2} ${x2} ${y}`} stroke={INK} strokeWidth="2" fill="none" />
      {Array.from({ length: count }, (_, i) => {
        const a = at((i + 0.15) / count);
        const b = at((i + 0.85) / count);
        const mid = at((i + 0.5) / count);
        return <path key={i} d={`M${a.x} ${a.y} L${b.x} ${b.y} L${mid.x} ${mid.y + 46} Z`} fill={colors[i % colors.length]} />;
      })}
    </g>
  );
}

/** A potted plant. `x` and `y` are the foot of the pot. */
export function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g fill={paper("leaf")}>
        <ellipse cx="-22" cy="-70" rx="14" ry="38" transform="rotate(-30 -22 -70)" />
        <ellipse cx="22" cy="-72" rx="14" ry="38" transform="rotate(30 22 -72)" />
      </g>
      <ellipse cx="0" cy="-88" rx="15" ry="44" fill={paper("leaf-dark")} />
      <path d="M-32 -46 L32 -46 L24 0 L-24 0 Z" fill={paper("clay")} />
      <rect x="-36" y="-52" width="72" height="12" rx="4" fill={paper("clay")} />
    </g>
  );
}

/** A plain wooden cross. */
export function Cross({ x, y, s = 1, fill = paper("wood-dark") }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}>
      <rect x="-7" y="-50" width="14" height="100" rx="2" />
      <rect x="-30" y="-28" width="60" height="14" rx="2" />
    </g>
  );
}

/** Painted words on a board or poster, in the lesson's display font. */
export function SignText({ x, y, text, size, fill = INK }: { x: number; y: number; text: string; size: number; fill?: string }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={size}
      fontWeight="800"
      fill={fill}
      className="font-story"
    >
      {text}
    </text>
  );
}
