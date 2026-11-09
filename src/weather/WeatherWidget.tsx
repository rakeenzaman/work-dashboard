import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { coarse, describe, fetchWeather, searchPlaces, type Place, type PlaceResult, type Unit, type Weather } from './api';
import { WeatherIcon } from './WeatherIcon';
import { WeatherSky } from './WeatherSky';
import { LocationIcon, SearchIcon } from '../components/icons';
import { spring } from '../motion';
import './weather.css';

const PLACE_KEY = 'weather-place';
const UNIT_KEY = 'weather-unit';
const REFRESH_MS = 15 * 60_000;
const MY_LOCATION = 'My Location';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: settings just won't persist.
  }
}

const defaultUnit = (): Unit => (/-(US|LR|MM)$/i.test(navigator.language) ? 'fahrenheit' : 'celsius');

type GeoState = 'idle' | 'pending' | 'denied';

export function WeatherWidget() {
  const [place, setPlace] = useState<Place | null>(() => read<Place>(PLACE_KEY));
  const [unit, setUnit] = useState<Unit>(() => read<Unit>(UNIT_KEY) ?? defaultUnit());
  const [weather, setWeather] = useState<Weather | null>(null);
  const [failed, setFailed] = useState(false);
  const [geo, setGeo] = useState<GeoState>('idle');
  const [open, setOpen] = useState(false);
  const [reload, setReload] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const choose = useCallback((next: Place) => {
    const rounded = { ...next, lat: coarse(next.lat), lon: coarse(next.lon) };
    write(PLACE_KEY, rounded);
    setPlace(rounded);
    setOpen(false);
  }, []);

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGeo('denied');
      return;
    }
    setGeo('pending');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo('idle');
        choose({ name: MY_LOCATION, lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => setGeo('denied'),
      { maximumAge: 30 * 60_000, timeout: 10_000 },
    );
  }, [choose]);

  // First visit: ask for location once; if declined, the widget offers city search instead.
  useEffect(() => {
    if (!read(PLACE_KEY)) locate();
  }, [locate]);

  useEffect(() => {
    if (!place) return;
    const ctrl = new AbortController();
    const load = () =>
      fetchWeather(place, unit, ctrl.signal)
        .then((w) => {
          setWeather(w);
          setFailed(false);
        })
        .catch((err) => {
          if (!ctrl.signal.aborted) setFailed(true);
          if (err?.name !== 'AbortError') console.warn(err);
        });
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      ctrl.abort();
      window.clearInterval(timer);
    };
  }, [place, unit, reload]);

  // Lets the page's ambient glow follow the sky.
  const info = weather ? describe(weather.code) : null;
  const mood = info ? `${info.kind}-${weather!.isDay ? 'day' : 'night'}` : null;
  useEffect(() => {
    const root = document.documentElement;
    if (mood) root.dataset.weather = mood;
    return () => {
      delete root.dataset.weather;
    };
  }, [mood]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function changeUnit(next: Unit) {
    write(UNIT_KEY, next);
    setUnit(next);
  }

  const state = !place ? (geo === 'pending' ? 'loading' : 'empty') : failed && !weather ? 'error' : weather ? 'ready' : 'loading';

  return (
    <div className="wx" ref={rootRef}>
      <motion.button
        type="button"
        className={`wx-card glass ${state === 'ready' ? 'has-sky' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={weather && info && place ? `${Math.round(weather.temp)}°, ${info.label} in ${place.name}. Weather settings` : 'Weather settings'}
        onClick={() => (state === 'error' ? setReload((n) => n + 1) : setOpen((o) => !o))}
        whileTap={{ scale: 0.97 }}
        transition={spring}
      >
        <AnimatePresence initial={false}>
          {state === 'ready' && weather && info && (
            <motion.span
              key={mood}
              className="sky-layer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              <WeatherSky kind={info.kind} isDay={weather.isDay} />
            </motion.span>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={state === 'ready' ? `ready-${info?.kind}-${weather?.isDay}` : state}
            className={`wx-content ${state === 'ready' ? 'is-ready' : ''}`}
            initial={{ opacity: 0, filter: 'blur(6px)', scale: 0.96 }}
            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
            exit={{ opacity: 0, filter: 'blur(6px)', scale: 0.96 }}
            transition={{ duration: 0.25 }}
          >
            {state === 'ready' && weather && info && place && (
              <>
                <span className="wx-place">
                  {place.name}
                  {place.name === MY_LOCATION && <LocationIcon size={10} strokeWidth={2.6} className="wx-pin" />}
                </span>
                <span className="wx-glyph">
                  <WeatherIcon kind={info.kind} isDay={weather.isDay} size={44} />
                </span>
                <span className="wx-temp">{Math.round(weather.temp)}°</span>
                <span className="wx-sub">
                  <span className="wx-cond">{info.label}</span>
                  <span>
                    H:{Math.round(weather.high)}° L:{Math.round(weather.low)}°
                  </span>
                </span>
              </>
            )}
            {state === 'loading' && (
              <>
                <span className="wx-skel wx-skel-icon" />
                <span className="wx-info">
                  <span className="wx-skel wx-skel-line" />
                  <span className="wx-skel wx-skel-line short" />
                </span>
              </>
            )}
            {state === 'empty' && (
              <>
                <span className="wx-empty-icon">
                  <LocationIcon size={18} />
                </span>
                <span className="wx-info">
                  <span className="wx-cond">Weather</span>
                  <span className="wx-sub">Choose a city</span>
                </span>
              </>
            )}
            {state === 'error' && (
              <span className="wx-info">
                <span className="wx-cond">Weather unavailable</span>
                <span className="wx-sub">Click to retry</span>
              </span>
            )}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && <WeatherPopover unit={unit} geo={geo} onUnit={changeUnit} onPick={choose} onLocate={locate} />}
      </AnimatePresence>
    </div>
  );
}

interface PopoverProps {
  unit: Unit;
  geo: GeoState;
  onUnit: (unit: Unit) => void;
  onPick: (place: Place) => void;
  onLocate: () => void;
}

function WeatherPopover({ unit, geo, onUnit, onPick, onLocate }: PopoverProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      searchPlaces(q, ctrl.signal)
        .then(setResults)
        .catch(() => {});
    }, 250);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  return (
    <motion.div
      className="wx-pop"
      role="dialog"
      aria-label="Weather settings"
      initial={{ opacity: 0, scale: 0.9, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -4, transition: { duration: 0.15 } }}
      transition={spring}
      style={{ originX: 1, originY: 0 }}
    >
      <label className="wx-search">
        <SearchIcon size={15} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a city"
          aria-label="Search for a city"
        />
      </label>

      <AnimatePresence initial={false}>
        {results.length > 0 && (
          <motion.ul
            className="wx-results"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring}
          >
            {results.map((r) => (
              <li key={`${r.lat},${r.lon}`}>
                <button type="button" className="wx-row" onClick={() => onPick(r)}>
                  <span>{r.name}</span>
                  <small>{r.region}</small>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <button type="button" className="wx-row wx-locate" onClick={onLocate} disabled={geo === 'pending'}>
        <LocationIcon size={15} />
        <span>{geo === 'pending' ? 'Locating…' : 'Use My Location'}</span>
      </button>
      {geo === 'denied' && <p className="wx-note">Location access is off. Search for a city instead.</p>}

      <div className="wx-units">
        <span>Units</span>
        <div className="segmented" role="radiogroup" aria-label="Temperature units">
          {(['fahrenheit', 'celsius'] as const).map((u) => (
            <button key={u} type="button" role="radio" aria-checked={unit === u} onClick={() => onUnit(u)}>
              {unit === u && <motion.span layoutId="wx-unit-thumb" className="segmented-thumb" transition={spring} />}
              <span className="segmented-label">{u === 'fahrenheit' ? '°F' : '°C'}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
