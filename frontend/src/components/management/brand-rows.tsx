"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MediaImage } from "@/components/media/media-image";
import type { Reference } from "@/lib/management-api";
import styles from "./management.module.css";
import dragStyles from "./brand-rows.module.css";

export function BrandRows({ brands, disabled, saving, onMove, onEdit, onDelete }: {
  brands: Reference[]; disabled: boolean; saving: boolean;
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
    {brands.map((brand, index) => <tr key={brand.id} data-brand-row={brand.id} data-dragging={floating?.brand.id === brand.id} data-drop-target={over === brand.id && floating?.brand.id !== brand.id} className={dragStyles.row}>
      <td><div className={dragStyles.identity}>
        <button type="button" className={dragStyles.handle} aria-label={`Drag ${brand.name}`} title="Drag onto another row to place before it" disabled={disabled || saving}
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
            if (floatingRef.current) floatingRef.current.style.transform = `translate3d(${event.clientX - 30}px,${event.clientY - 30}px,0)`;
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
        <MediaImage src={brand.logo_url} alt={`${brand.name} logo`} width={72} height={52} sizes="72px" className={dragStyles.thumbnail} />
        <div><strong>{brand.name}</strong><small>{brand.slug}</small></div>
      </div></td>
      <td><span className={`${styles.badge} ${brand.show_on_homepage ? "" : styles.inactive}`}>{brand.show_on_homepage ? "Shown" : "Hidden"}</span></td>
      <td>{brand.display_order ?? 0}<div className={dragStyles.orderButtons}>
        <button aria-label={`Move ${brand.name} up`} disabled={disabled || saving || index === 0} onClick={() => onMove(brand.id, brands[index - 1].id)}>↑</button>
        <button aria-label={`Move ${brand.name} to end`} disabled={disabled || saving} onClick={() => onMove(brand.id, null)}>⇣</button>
      </div></td>
      <td><span className={`${styles.badge} ${brand.is_active ? "" : styles.inactive}`}>{brand.is_active ? "Active" : "Inactive"}</span></td>
      <td><div className={styles.actions}><button className={styles.secondary} onClick={() => onEdit(brand)}>Edit</button><button className={styles.danger} onClick={() => onDelete(brand)}>Delete</button></div></td>
    </tr>)}
    {floating && createPortal(<div ref={floatingRef} data-testid="brand-drag-preview" aria-hidden="true" className={dragStyles.floating} style={{ transform: `translate3d(${floating.x}px,${floating.y}px,0)` }}>
      <div className={dragStyles.lifted}><MediaImage src={floating.brand.logo_url} alt="" width={100} height={70} sizes="100px" /><strong>{floating.brand.name}</strong><span>Drop before a brand · Esc to cancel</span></div>
    </div>, document.body)}
  </>;
}
