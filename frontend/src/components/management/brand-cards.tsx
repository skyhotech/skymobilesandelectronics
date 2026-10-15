"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MediaImage } from "@/components/media/media-image";
import type { Reference } from "@/lib/management-api";
import styles from "./category-manager.module.css";
import { Icon } from "./category-cards";

export function BrandCards({ brands, disabled, saving, view, onMove, onEdit, onDelete, onAdd }: {
  brands: Reference[]; disabled: boolean; saving: boolean; view: "grid" | "list"; onAdd: () => void;
  onMove: (id: number, before: number | null) => void;
  onEdit: (brand: Reference) => void; onDelete: (brand: Reference) => void;
}) {
  const active = useRef<{ brand: Reference; pointer: number; x: number; y: number; moved: boolean } | null>(null);
  const [floating, setFloating] = useState<{ brand: Reference; x: number; y: number } | null>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const [over, setOver] = useState<number | null>(null);
  const clear = () => { active.current = null; setFloating(null); setOver(null); };
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") clear(); };
    window.addEventListener("keydown", escape);
    window.addEventListener("blur", clear);
    return () => { window.removeEventListener("keydown", escape); window.removeEventListener("blur", clear); };
  }, []);
  const target = (x: number, y: number) => document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-brand-row]");
  return <>
    <div className={view === "grid" ? styles.grid : styles.list}>
    {brands.map((brand, index) => <article key={brand.id} aria-label={brand.name} data-brand-row={brand.id} data-dragging={floating?.brand.id === brand.id} data-drop-target={over === brand.id && floating?.brand.id !== brand.id} data-inactive={!brand.is_active} className={styles.card}>
      <button type="button" className={styles.cardLink} aria-label={`Edit ${brand.name} details`} onClick={() => onEdit(brand)} />
      <div className={styles.cardMedia}>
        <MediaImage src={brand.logo_url} alt={`${brand.name} logo`} width={240} height={150} />
        <span className={`${styles.pill} ${styles.mediaPill}`} data-tone={brand.is_active ? "ok" : "off"}>{brand.is_active ? "Active" : "Inactive"}</span>
        <button type="button" className={styles.dragHandle} style={{ touchAction: "none" }} aria-label={`Drag ${brand.name}`} title="Drag onto another card to place before it" disabled={disabled || saving}
          onPointerDown={event => {
            if (event.button !== 0 || !event.isPrimary || active.current) return;
            active.current = { brand, pointer: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={event => {
            const drag = active.current;
            if (!drag || drag.pointer !== event.pointerId) return;
            drag.moved ||= Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 6;
            if (!drag.moved) return;
            if (!floating) setFloating({ brand, x: event.clientX - 30, y: event.clientY - 30 });
            if (floatingRef.current) {
              const tilt = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "" : " rotateX(6deg) rotateY(-8deg) rotateZ(-2deg)";
              floatingRef.current.style.transform = `perspective(900px) translate3d(${event.clientX - 30}px,${event.clientY - 30}px,0)${tilt}`;
            }
            const row = target(event.clientX, event.clientY);
            setOver(row ? Number(row.dataset.brandRow) : null);
            if (event.clientY < 80) window.scrollBy(0, -16);
            if (event.clientY > window.innerHeight - 70) window.scrollBy(0, 16);
          }}
          onPointerUp={event => {
            const drag = active.current;
            if (!drag || drag.pointer !== event.pointerId) return;
            const row = target(event.clientX, event.clientY);
            const before = row ? Number(row.dataset.brandRow) : null;
            clear();
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            if (drag.moved && row && before !== brand.id) onMove(brand.id, before);
          }}
          onPointerCancel={event => { if (active.current?.pointer === event.pointerId) clear(); }}
          onLostPointerCapture={event => { if (active.current?.pointer === event.pointerId) clear(); }}
        >⠿</button>
      </div>
      <div className={styles.cardBody}><h3>{brand.name}</h3><p className={styles.cardPath}>/{brand.slug}</p>
        <div className={styles.cardMeta}><span className={styles.metaChip}>{brand.show_on_homepage ? "On homepage" : "Hidden from homepage"}</span><span className={styles.metaChip}>Order {brand.display_order ?? 0}</span></div>
      </div>
      <div className={styles.cardActions}>
        <button className={styles.actionButton} onClick={() => onEdit(brand)}>Edit</button>
        <button className={`${styles.actionButton} ${styles.actionDanger}`} onClick={() => onDelete(brand)}>Delete</button>
        <span className={styles.orderButtons}>
          <button className={styles.iconButton} aria-label={`Move ${brand.name} up`} disabled={disabled || saving || index === 0} onClick={() => onMove(brand.id, brands[index - 1].id)}>{Icon.up}</button>
          <button className={styles.iconButton} aria-label={`Move ${brand.name} down`} disabled={disabled || saving || index === brands.length - 1} onClick={() => onMove(brand.id, brands[index + 2]?.id ?? null)}>{Icon.down}</button>
        </span>
      </div>
    </article>)}
    {view === "grid" && <button type="button" className={styles.addTile} onClick={onAdd}><span className={styles.addTileIcon}>{Icon.plus}</span><span>New brand</span></button>}
    </div>
    {floating && createPortal(<div ref={floatingRef} data-testid="brand-drag-preview" aria-hidden="true" className={styles.floatingCard} style={{ width: 240, transform: `translate3d(${floating.x}px,${floating.y}px,0)` }}>
      <div className={styles.floatingArtwork}><MediaImage src={floating.brand.logo_url} alt="" width={240} height={150} /></div><strong>{floating.brand.name}</strong><span>Drop before a brand &middot; Esc to cancel</span>
    </div>, document.body)}
  </>;
}
