"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSyncExternalStore } from "react";

const INTRO_KEY = "vanta:intro-seen:v1";
type IntroState = "hidden" | "visible" | "leaving";
let introState: IntroState = "hidden";
let introStarted = false;
const introListeners = new Set<() => void>();

function emitIntroState() {
  for (const listener of introListeners) listener();
}

function getIntroState() {
  return introState;
}

function subscribeToIntro(onStoreChange: () => void) {
  introListeners.add(onStoreChange);

  if (!introStarted) {
    introStarted = true;
    let alreadySeen = false;
    try {
      alreadySeen = Boolean(sessionStorage.getItem(INTRO_KEY));
      if (!alreadySeen) sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      // Continue with the intro if session storage is blocked.
    }

    if (!alreadySeen) {
      introState = "visible";
      emitIntroState();
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const duration = reducedMotion ? 450 : 1500;
      window.setTimeout(() => {
        introState = "leaving";
        emitIntroState();
      }, duration - 320);
      window.setTimeout(() => {
        introState = "hidden";
        emitIntroState();
      }, duration);
    }
  }

  return () => introListeners.delete(onStoreChange);
}

export function IntroLoader() {
  const state = useSyncExternalStore(subscribeToIntro, getIntroState, () => "hidden");
  const visible = state !== "hidden";
  const leaving = state === "leaving";
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="intro-loader"
          aria-hidden="true"
          initial={{ opacity: 1 }}
          animate={{ opacity: leaving ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.46, ease: [0.76, 0, 0.24, 1] }}
        >
          <motion.div
            className="intro-loader__lockup"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16, letterSpacing: "0.42em" }}
            animate={{ opacity: 1, y: 0, letterSpacing: "0.26em" }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <span className="intro-loader__glyph">V</span>
            <span>VANTA</span>
          </motion.div>
          <p className="intro-loader__caption">The future, in form.</p>
          <div className="intro-loader__track">
            <motion.span
              initial={{ scaleX: prefersReducedMotion ? 1 : 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: prefersReducedMotion ? 0 : 1.12, delay: prefersReducedMotion ? 0 : 0.24, ease: [0.76, 0, 0.24, 1] }}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
