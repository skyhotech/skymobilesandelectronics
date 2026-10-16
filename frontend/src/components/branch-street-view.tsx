"use client";
import { useId, useState } from "react";
import styles from "./branch-street-view.module.css";

function safeEmbed(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "www.google.com" && ["/maps/embed", "/maps/embed/"].includes(url.pathname) && !url.username && !url.password && (!url.port || url.port === "443") && Boolean(url.searchParams.get("pb")) && !url.searchParams.has("key"); } catch { return false; }
}
export function BranchStreetView({ name, embedUrl }: { name: string; embedUrl: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!safeEmbed(embedUrl)) return <p className={styles.unset}>360° Street View not configured</p>;
  return <div className={styles.viewer}><button type="button" className={styles.button} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{open ? "Close 360° Street View" : "View 360° Street View"}</button><div id={id}>{open && <><iframe src={embedUrl} title={`360° Street View of ${name}`} className={styles.frame} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" /><p>Drag to look around. Use the viewer controls for fullscreen.</p><a href={embedUrl} target="_blank" rel="noopener noreferrer">Open viewer in Google Maps</a></>}</div></div>;
}
