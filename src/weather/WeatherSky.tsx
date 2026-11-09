import type { CSSProperties } from 'react';
import type { WeatherKind } from './api';

interface Props {
  kind: WeatherKind;
  isDay: boolean;
}

// Fixed pseudo-random scatter (same every render), 0–1.
const rand = (i: number, n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

const STARS = Array.from({ length: 16 }, (_, i) => ({
  left: pct(rand(i, 1)),
  top: pct(rand(i, 2) * 0.75),
  '--size': `${1 + rand(i, 3) * 1.5}px`,
  animationDelay: `${-rand(i, 4) * 3}s`,
  animationDuration: `${2 + rand(i, 5) * 2}s`,
}));

const CLOUDS = [
  { left: '-20%', top: '-10%', animationDuration: '22s', animationDelay: '-4s' },
  { left: '35%', top: '25%', animationDuration: '28s', animationDelay: '-15s' },
  { left: '-5%', top: '55%', animationDuration: '25s', animationDelay: '-9s' },
];

const DROPS = Array.from({ length: 22 }, (_, i) => ({
  left: pct(rand(i, 6) * 1.1),
  animationDelay: `${-rand(i, 7) * 0.8}s`,
  animationDuration: `${0.55 + rand(i, 8) * 0.25}s`,
  opacity: 0.35 + rand(i, 9) * 0.4,
}));

const FLAKES = Array.from({ length: 20 }, (_, i) => ({
  left: pct(rand(i, 10)),
  '--size': `${2 + rand(i, 11) * 2.5}px`,
  '--sway': `${4 + rand(i, 12) * 8}px`,
  animationDelay: `${-rand(i, 13) * 6}s, ${-rand(i, 14) * 2}s`,
  animationDuration: `${4.5 + rand(i, 15) * 3}s, ${1.6 + rand(i, 16) * 1.2}s`,
}));

const FOG = [
  { top: '18%', animationDuration: '14s' },
  { top: '48%', animationDuration: '18s', animationDirection: 'alternate-reverse' },
  { top: '74%', animationDuration: '16s' },
];

const style = (s: object) => s as CSSProperties;

/** Sky behind the weather widget: a gradient per condition and time of day, with gentle motion. */
export function WeatherSky({ kind, isDay }: Props) {
  const clouds = kind === 'partly' ? 2 : kind === 'cloudy' || kind === 'rain' || kind === 'snow' || kind === 'storm' ? 3 : 0;
  const clear = kind === 'clear' || kind === 'partly';

  return (
    <span className={`sky sky-${kind} ${isDay ? 'is-day' : 'is-night'}`} aria-hidden="true">
      {clear && isDay && <span className="sky-sun" />}
      {clear &&
        !isDay &&
        STARS.map((s, i) => <span key={i} className="sky-star" style={style(s)} />)}
      {CLOUDS.slice(0, clouds).map((c, i) => (
        <span key={i} className="sky-cloud" style={c} />
      ))}
      {kind === 'fog' && FOG.map((f, i) => <span key={i} className="sky-mist" style={style(f)} />)}
      {(kind === 'rain' || kind === 'storm') && DROPS.map((d, i) => <span key={i} className="sky-drop" style={d} />)}
      {kind === 'snow' && FLAKES.map((f, i) => <span key={i} className="sky-flake" style={style(f)} />)}
      {kind === 'storm' && <span className="sky-flash" />}
    </span>
  );
}
