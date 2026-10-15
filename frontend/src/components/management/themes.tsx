"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import workspace from "./category-manager.module.css";
import styles from "./themes.module.css";

export function ManagementThemes() {
  const preview = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLElement>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const element = preview.current;
    if (!element) return;
    const measure = () => element.style.setProperty("--preview-scale", String(element.clientWidth / 1440));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const resetTilt = () => {
    card.current?.style.setProperty("--tilt-x", "0deg");
    card.current?.style.setProperty("--tilt-y", "0deg");
  };
  return <section className={workspace.workspace} aria-label="Homepage themes">
    <header className={workspace.pageHeader}>
      <div className={workspace.titleRow}><div className={workspace.titleBlock}><div>
        <h1>Themes</h1><p>Preview your homepage and choose its appearance.</p>
      </div></div></div>
    </header>
    <div className={styles.grid}>
      <article ref={card} className={styles.card} aria-label="Default theme preview card"
        onPointerMove={event => {
          if (event.pointerType !== "mouse" || event.currentTarget.contains(document.activeElement) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
          const rect = event.currentTarget.getBoundingClientRect();
          event.currentTarget.style.setProperty("--tilt-x", `${(0.5 - (event.clientY - rect.top) / rect.height) * 5}deg`);
          event.currentTarget.style.setProperty("--tilt-y", `${((event.clientX - rect.left) / rect.width - 0.5) * 7}deg`);
        }} onPointerLeave={resetTilt} onPointerCancel={resetTilt} onFocusCapture={resetTilt}>
        <div className={styles.browserBar}><span aria-hidden="true">● ● ●</span><span>skymobile.in</span><strong>Live preview</strong></div>
        <div ref={preview} className={styles.preview} inert>
          <iframe src="/" title="Default theme homepage preview" loading="lazy" tabIndex={-1} aria-hidden="true" />
        </div>
        <div className={styles.body}>
          <div className={styles.heading}><label><input type="radio" name="homepage-theme" value="default" defaultChecked /> <strong>Default theme</strong></label><span className={styles.active}>Active</span></div>
          <p>Your current SKY storefront, shown live. More themes can be added when ready.</p>
          <div className={styles.actions}>
            <button type="button" onClick={() => setNotice("Default theme is already active. Your homepage design is unchanged.")}>Apply theme</button>
            <Link href="/" target="_blank" rel="noopener noreferrer">View current homepage ↗</Link>
          </div>
        </div>
      </article>
    </div>
    <p role="status" className={styles.notice}>{notice}</p>
  </section>;
}
