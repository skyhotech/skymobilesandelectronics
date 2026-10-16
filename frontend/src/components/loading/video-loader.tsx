"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import styles from "./page-loader.module.css";

function subscribeMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function reducedMotion() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }

export function VideoLoader({ active }: { active: boolean }) {
  const reduced = useSyncExternalStore(subscribeMotion, reducedMotion, () => false);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!active || reduced) {
      video.current?.pause();
      return;
    }
    // Playback never controls request completion; the text remains a fallback.
    video.current?.play().catch(() => {});
  }, [active, reduced]);
  if (!active) return null;
  return <div className={styles.overlay} role="status" aria-live="polite" aria-label="Loading page">
    <div className={styles.content}>
      <video ref={video} src="/videos/loader-4k.mp4" autoPlay={!reduced} loop={!reduced} muted playsInline preload="auto" aria-hidden="true" tabIndex={-1} />
    </div>
    <p className={styles.message}>Loading, please wait...</p>
  </div>;
}
