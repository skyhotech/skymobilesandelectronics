"use client";
import { useId, useRef, useEffect, useState } from "react";
import styles from "./branch-street-view.module.css";

function safeEmbed(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "www.google.com" || url.username || url.password || (url.port && url.port !== "443")) return false;
    return (["/maps/embed", "/maps/embed/"].includes(url.pathname) && Boolean(url.searchParams.get("pb")) && !url.searchParams.has("key")) || (url.pathname === "/maps/embed/v1/streetview" && Boolean(url.searchParams.get("key")) && Boolean(url.searchParams.get("pano") || url.searchParams.get("location")));
  } catch { return false; }
}
function PanoramaDialog({ name, embedUrl, close, map = false }: { name: string; embedUrl: string; close: () => void; map?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close(); }, []);
  return <dialog ref={dialog} aria-labelledby={title} className={styles.dialog} onCancel={event => { event.preventDefault(); close(); }}><div className={styles.heading}><h3 id={title}>{name} - {map ? "Location" : "360 Street View"}</h3><button className={styles.button} onClick={close}>Close viewer</button></div><iframe src={embedUrl} title={map ? `Map of ${name}` : `360 Street View of ${name}`} className={styles.frame} allowFullScreen referrerPolicy="no-referrer-when-downgrade" /><p>{map ? "Explore the branch location with Google Maps." : "Drag to look around. Use the Google viewer controls for fullscreen."}</p><a href={embedUrl} target="_blank" rel="noopener noreferrer">Open viewer in Google Maps</a></dialog>;
}
export function BranchStreetView({ name, embedUrl, preview = false }: { name: string; embedUrl: string; preview?: boolean }) {
  const [open, setOpen] = useState(false);
  if (!safeEmbed(embedUrl)) return <p className={styles.unset}>Street View awaiting location or panorama verification</p>;
  return <div className={styles.viewer}><button type="button" className={styles.button} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>{preview ? "Preview 360 Street View" : "Explore in 360"}</button>{open && <PanoramaDialog name={name} embedUrl={embedUrl} close={() => setOpen(false)} />}</div>;
}

export function BranchMapView({ name, embedUrl }: { name: string; embedUrl: string }) {
  const [open, setOpen] = useState(false);
  let valid = false;
  try { const url = new URL(embedUrl); valid = url.protocol === "https:" && url.hostname === "www.google.com" && !url.username && !url.password && (!url.port || url.port === "443") && url.pathname === "/maps/embed/v1/place" && Boolean(url.searchParams.get("key")) && Boolean(url.searchParams.get("q")); } catch {}
  if (!valid) return null;
  return <><button className={styles.button} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>View Location</button>{open && <PanoramaDialog name={name} embedUrl={embedUrl} close={() => setOpen(false)} map />}</>;
}
