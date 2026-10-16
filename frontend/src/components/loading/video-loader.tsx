"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./page-loader.module.css";

function subscribeMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function reducedMotion() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }

export function VideoLoader({ active }: { active: boolean }) {
  const reduced = useSyncExternalStore(subscribeMotion, reducedMotion, () => false);
  const [cycle, setCycle] = useState({ active: false, finished: true });
  const video = useRef<HTMLVideoElement>(null);
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (cycle.active !== active) {
    setCycle({ active, finished: active && cycle.finished ? reduced : cycle.finished });
  } else if (reduced && !cycle.finished) {
    setCycle({ active, finished: true });
  }
  const visible = active || !cycle.finished;
  const clearWatchdog = useCallback(() => { if (watchdog.current) clearTimeout(watchdog.current); watchdog.current = null; }, []);
  const finish = useCallback(() => { clearWatchdog(); setCycle(previous => ({ ...previous, finished: true })); }, [clearWatchdog]);
  const waitForPlayback = useCallback(() => { clearWatchdog(); watchdog.current = setTimeout(finish, 10000); }, [clearWatchdog, finish]);
  useEffect(() => {
    if (!visible) return;
    if (reduced) { video.current?.pause(); return; }
    waitForPlayback();
    video.current?.play().catch(finish);
    return clearWatchdog;
  }, [visible, reduced, waitForPlayback, finish, clearWatchdog]);
  if (!visible) return null;
  return <div className={styles.overlay} role="status" aria-live="polite" aria-label="Loading page">
    <div className={styles.content}>
      <video ref={video} src="/videos/loader.mp4" autoPlay={!reduced} muted playsInline preload="auto" aria-hidden="true" tabIndex={-1} onEnded={finish} onError={finish} onPlaying={clearWatchdog} onWaiting={waitForPlayback} />
    </div>
    <p className={styles.message}>Loading, please wait...</p>
  </div>;
}
