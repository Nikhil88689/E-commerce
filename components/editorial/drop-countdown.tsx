"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

type TimeParts = { days: number; hours: number; minutes: number; seconds: number };

function remaining(target: number, now: number): TimeParts {
  const totalSeconds = Math.max(0, Math.floor((target - now) / 1000));
  return { days: Math.floor(totalSeconds / 86400), hours: Math.floor(totalSeconds / 3600) % 24, minutes: Math.floor(totalSeconds / 60) % 60, seconds: totalSeconds % 60 };
}

function Tick({ value, label, reducedMotion }: { value: number; label: string; reducedMotion: boolean }) {
  const text = label === "DAYS" ? String(value).padStart(2, "0") : String(value).padStart(2, "0");
  return <span className="drop-countdown__unit"><span className="drop-countdown__digits"><AnimatePresence mode="popLayout" initial={false}><motion.b key={text} initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -8 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}>{text}</motion.b></AnimatePresence></span><small>{label}</small></span>;
}

export function DropCountdown({ releaseAt }: { releaseAt: string }) {
  const reducedMotion = Boolean(useReducedMotion());
  const target = new Date(releaseAt).getTime();
  const [time, setTime] = useState<TimeParts | null>(null);
  useEffect(() => {
    const update = () => setTime(remaining(target, Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  if (!Number.isFinite(target)) return <p className="drop-date-note">Release timing has not been confirmed.</p>;
  return <div className="drop-countdown" aria-label="Countdown until release">
    {time ? <><Tick value={time.days} label="DAYS" reducedMotion={reducedMotion} /><i aria-hidden="true">:</i><Tick value={time.hours} label="HOURS" reducedMotion={reducedMotion} /><i aria-hidden="true">:</i><Tick value={time.minutes} label="MINUTES" reducedMotion={reducedMotion} /><i aria-hidden="true">:</i><Tick value={time.seconds} label="SECONDS" reducedMotion={reducedMotion} /></> : <span className="drop-countdown__loading">Preparing release clock</span>}
    <time className="drop-countdown__date" dateTime={releaseAt}>{new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }).format(new Date(target))} UTC</time>
  </div>;
}
