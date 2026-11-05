import { useId } from 'react';
import type { WeatherKind } from './api';

interface Props {
  kind: WeatherKind;
  isDay: boolean;
  size?: number;
}

const CLOUD = 'M19 46h27a9.5 9.5 0 0 0 .8-18.97A13 13 0 0 0 22.4 28.6 8.75 8.75 0 0 0 19 46Z';
const SPARKLE = 'M0-3 .8-.8 3 0 .8.8 0 3-.8.8-3 0-.8-.8Z';

/**
 * Shift that centers each composition's drawn bounds in the 64×64 box (measured from the rendered
 * shapes). Partly-sunny favors its sun-and-cloud mass a little over the faint ray tips.
 */
function optical(kind: WeatherKind, isDay: boolean): [number, number] {
  switch (kind) {
    case 'clear':
      return isDay ? [0, 0] : [1, 3];
    case 'partly':
      return isDay ? [4, 8] : [1, 6];
    case 'cloudy':
      return [1, 2];
    case 'storm':
      return [-2, -3];
    case 'fog':
      return [-2, -2];
    default:
      return [-2, 0];
  }
}

/** Animated weather glyph; the motion lives in weather.css and stops under "Reduce motion". */
export function WeatherIcon({ kind, isDay, size = 52 }: Props) {
  const id = useId().replace(/:/g, '');
  const celestial = kind === 'clear' || kind === 'partly';
  const precip = kind === 'rain' || kind === 'snow' || kind === 'storm' || kind === 'fog';
  const [dx, dy] = optical(kind, isDay);

  return (
    <svg className={`wx-icon wx-${kind}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-sun`} cx="40%" cy="35%" r="75%">
          <stop offset="0" stopColor="#ffe36e" />
          <stop offset="1" stopColor="#ffa800" />
        </radialGradient>
        <linearGradient id={`${id}-cloud`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--wx-cloud-a)' }} />
          <stop offset="1" style={{ stopColor: 'var(--wx-cloud-b)' }} />
        </linearGradient>
        <mask id={`${id}-moon`}>
          <rect width="64" height="64" fill="#fff" />
          <circle cx="40" cy="23" r="10.5" fill="#000" />
        </mask>
      </defs>

      <g className="wx-art" transform={`translate(${dx} ${dy})`}>
        {celestial && (
          <g transform={kind === 'partly' ? 'translate(-8 -9) scale(0.85)' : undefined}>
            {isDay ? (
              <g className="wx-sun">
                <g className="wx-rays" stroke="#ffb300" strokeWidth="2.6" strokeLinecap="round">
                  {Array.from({ length: 8 }, (_, i) => (
                    <line key={i} x1="32" y1="13" x2="32" y2="8" transform={`rotate(${i * 45} 32 32)`} />
                  ))}
                </g>
                <circle className="wx-core" cx="32" cy="32" r="12" fill={`url(#${id}-sun)`} />
              </g>
            ) : (
              <g className="wx-moon">
                <circle cx="32" cy="30" r="13" fill="var(--wx-moon)" mask={`url(#${id}-moon)`} />
                {kind === 'clear' &&
                  [
                    [50, 40, 0],
                    [14, 18, 0.7],
                    [47, 12, 1.4],
                  ].map(([x, y, delay]) => (
                    <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
                      <path className="wx-star" d={SPARKLE} fill="var(--wx-moon)" style={{ animationDelay: `${delay}s` }} />
                    </g>
                  ))}
              </g>
            )}
          </g>
        )}

        {kind === 'cloudy' && (
          <g transform="translate(14 -4) scale(0.72)">
            <path className="wx-drift wx-drift-slow" d={CLOUD} fill="var(--wx-cloud-back)" />
          </g>
        )}

        {kind !== 'clear' && (
          <g transform={kind === 'partly' ? 'translate(6 7) scale(0.86)' : precip ? 'translate(0 -6)' : 'translate(-3 4)'}>
            <path className="wx-cloud wx-drift" d={CLOUD} fill={`url(#${id}-cloud)`} />
          </g>
        )}

        {(kind === 'rain' || kind === 'storm') && (
          <g className="wx-drops" stroke="var(--wx-rain)" strokeWidth="2.6" strokeLinecap="round">
            {(kind === 'storm' ? [20, 44] : [22, 32, 42]).map((x, i) => (
              <line key={x} x1={x} y1="46" x2={x - 2} y2="51" style={{ animationDelay: `${i * 0.33}s` }} />
            ))}
          </g>
        )}

        {kind === 'storm' && <path className="wx-bolt" d="M34 41l-6 10h5l-3 9 9-12h-5l4-7Z" fill="#ffcc00" />}

        {kind === 'snow' && (
          <g className="wx-flakes" fill="var(--wx-snow)">
            {[22, 32, 42].map((x, i) => (
              <circle key={x} cx={x} cy="48" r="2.3" style={{ animationDelay: `${i * 0.6}s` }} />
            ))}
          </g>
        )}

        {kind === 'fog' && (
          <g className="wx-fog" stroke="var(--wx-cloud-b)" strokeWidth="3" strokeLinecap="round">
            <line x1="14" y1="47" x2="48" y2="47" />
            <line x1="20" y1="54" x2="54" y2="54" />
          </g>
        )}
      </g>
    </svg>
  );
}
