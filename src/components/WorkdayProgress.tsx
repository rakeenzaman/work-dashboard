import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';

const START_HOUR = 9;
const END_HOUR = 17;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

// Bubbles scattered along the bar with fixed pseudo-random sizes and timings (same every render).
const BUBBLE_COUNT = 72;
const BUBBLES = Array.from({ length: BUBBLE_COUNT }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return {
    left: `${(i / BUBBLE_COUNT) * 100 + r(1) * 1.4}%`,
    '--size': `${1.2 + r(2) * 1.6}px`,
    '--offset': `${(r(7) - 0.5) * 6}px`,
    '--duration': `${2.6 + r(3) * 2.2}s`,
    '--delay': `${-r(4) * 5}s`,
    '--drift': `${28 + r(5) * 34}px`,
    '--bob': `${0.6 + r(6) * 1}px`,
    '--bob-duration': `${0.7 + r(8) * 0.7}s`,
  } as CSSProperties;
});

function duration(minutes: number) {
  // Round the total first so 59.6 minutes becomes "1h 0m", never "0h 60m".
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

function hourLabel(hour: number) {
  const h = hour % 12 || 12;
  return hour === START_HOUR || hour === END_HOUR ? `${h} ${hour < 12 ? 'AM' : 'PM'}` : String(h);
}

function workday(now: Date): { percent: number; status: ReactNode; weekend: boolean } {
  const day = now.getDay();
  if (day === 0 || day === 6) return { percent: 0, status: 'Enjoy the weekend', weekend: true };
  const minutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const start = START_HOUR * 60;
  const end = END_HOUR * 60;
  const endLabel = new Date(now).setHours(END_HOUR, 0, 0, 0);
  const endTime = new Date(endLabel).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (minutes < start) return { percent: 0, status: `Starts in ${duration(start - minutes)}`, weekend: false };
  if (minutes >= end) return { percent: 100, status: 'Done for the day', weekend: false };
  return {
    percent: ((minutes - start) / (end - start)) * 100,
    status: (
      <>
        {duration(end - minutes)} left<span className="workday-until"> · until {endTime}</span>
      </>
    ),
    weekend: false,
  };
}

/** How far through the 9–5 workday it is right now. */
export function WorkdayProgress({ now }: { now: Date }) {
  const { percent, status, weekend } = workday(now);

  // One spring drives everything (fill, marker, number) so they move as one.
  const progress = useSpring(0, { stiffness: 110, damping: 22 });
  useEffect(() => {
    progress.set(percent);
  }, [percent, progress]);

  const left = useTransform(progress, (p) => `${p}%`);
  // Rounded down so it never reads 100% while there are still minutes left.
  const shown = useTransform(progress, (p) => Math.floor(p));

  return (
    <motion.section
      className="workday glass"
      aria-label="Workday progress"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30, delay: 0.08 }}
    >
      <div className="workday-top">
        <div className="workday-title">
          <span className="workday-label">Workday</span>
          {weekend ? (
            <span className="workday-pct">Weekend</span>
          ) : (
            <span className="workday-pct">
              <motion.span>{shown}</motion.span>%
            </span>
          )}
        </div>
        <span className="workday-status">{status}</span>
      </div>

      <div className="workday-track" aria-hidden="true">
        <motion.div className="workday-fill" style={{ width: left }}>
          <span className="workday-bubbles">
            {BUBBLES.map((b, i) => (
              <span key={i} className="workday-bubble" style={b} />
            ))}
          </span>
        </motion.div>
        {!weekend && <motion.div className="workday-head" style={{ left }} />}
      </div>

      <div className="workday-ticks" aria-hidden="true">
        {HOURS.map((hour) => {
          const at = ((hour - START_HOUR) / (END_HOUR - START_HOUR)) * 100;
          return (
            <span key={hour} className={!weekend && at <= percent ? 'is-past' : ''} style={{ left: `${at}%` }}>
              {hourLabel(hour)}
            </span>
          );
        })}
      </div>
    </motion.section>
  );
}
