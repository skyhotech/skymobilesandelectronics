"use client";

import { useEffect, useRef } from "react";
import styles from "./page-loader.module.css";

export function PageLoader() {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      if (preference.matches) video.current?.pause();
      else video.current?.play().catch(() => {});
    };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  return <div className={styles.overlay} role="status" aria-live="polite" aria-label="Loading page">
    <div className={styles.content}>
      <video ref={video} src="/videos/loader.mp4" autoPlay muted loop playsInline preload="auto" aria-hidden="true" tabIndex={-1} />
      <p>Loading, please wait…</p>
    </div>
  </div>;
}
