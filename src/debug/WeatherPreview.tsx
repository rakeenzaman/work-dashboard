// Dev-only page (weather-preview.html) showing the weather widget's sky and icon for every
// condition, day and night, using the real components and styles.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import { ThemeToggle } from '../components/ThemeToggle';
import { WeatherIcon } from '../weather/WeatherIcon';
import { WeatherSky } from '../weather/WeatherSky';
import type { WeatherKind } from '../weather/api';
import '../styles.css';
import '../weather/weather.css';

const KINDS: [WeatherKind, string][] = [
  ['clear', 'Clear'],
  ['partly', 'Partly Cloudy'],
  ['cloudy', 'Cloudy'],
  ['fog', 'Foggy'],
  ['rain', 'Rain'],
  ['snow', 'Snow'],
  ['storm', 'Thunderstorms'],
];

function Card({ kind, label, isDay }: { kind: WeatherKind; label: string; isDay: boolean }) {
  return (
    <figure className="preview-item">
      <div className="preview-card">
        <div className="wx-card glass has-sky">
          <span className="sky-layer">
            <WeatherSky kind={kind} isDay={isDay} />
          </span>
          <span className="wx-content is-ready">
            <span className="wx-place">Ridgeland</span>
            <span className="wx-glyph">
              <WeatherIcon kind={kind} isDay={isDay} size={44} />
            </span>
            <span className="wx-temp">72°</span>
            <span className="wx-sub">
              <span className="wx-cond">{label}</span>
              <span>H:77° L:50°</span>
            </span>
          </span>
        </div>
      </div>
      <figcaption>
        {kind} · {isDay ? 'day' : 'night'}
      </figcaption>
    </figure>
  );
}

function WeatherPreview() {
  return (
    <div className="app">
      <ThemeToggle />
      <header className="preview-head">
        <p className="eyebrow">Debug</p>
        <h1>Weather Preview</h1>
      </header>
      {[true, false].map((isDay) => (
        <section key={String(isDay)}>
          <h2 className="preview-title">{isDay ? 'Day' : 'Night'}</h2>
          <div className="preview-grid">
            {KINDS.map(([kind, label]) => (
              <Card key={kind} kind={kind} label={label} isDay={isDay} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const css = document.createElement('style');
css.textContent = `
  .preview-head h1 { margin: 0 0 8px; font-size: 40px; letter-spacing: -0.03em; }
  .preview-title { margin: 32px 0 12px; font-size: 20px; letter-spacing: -0.02em; }
  .preview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
  .preview-item { margin: 0; }
  .preview-card { display: flex; height: 128px; }
  .preview-item figcaption { margin-top: 6px; font-size: 12px; color: var(--text-2); }
`;
document.head.append(css);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <WeatherPreview />
    </MotionConfig>
  </StrictMode>,
);
