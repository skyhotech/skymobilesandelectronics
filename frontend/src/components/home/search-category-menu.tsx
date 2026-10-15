"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export function SearchCategoryMenu({
  entries,
}: {
  entries: { name: string; destination: string; slug?: string }[];
}) {
  const categories = useMemo(
    () => ["All Categories", ...entries.map((item) => item.name)],
    [entries],
  );
  const [selected, setSelected] = useState(categories[0]);
  const [open, setOpen] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const current = categories.includes(selected) ? selected : "All Categories";

  useEffect(() => {
    if (!open) return;
    items.current[categories.indexOf(current)]?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!host.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open, current, categories]);

  return (
    <div
      className="search-category-menu"
      ref={host}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <select
        id="search-category"
        aria-label="Search category"
        hidden
        value={current}
        onChange={(event) => setSelected(event.target.value)}
      >
        {categories.map((category) => (
          <option
            key={category}
            data-slug={entries.find((item) => item.name === category)?.slug}
            data-destination={entries.find((item) => item.name === category)?.destination}
          >
            {category}
          </option>
        ))}
      </select>
      <button
        ref={trigger}
        type="button"
        className="category-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="search-category-options"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span>{current}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="m3 4.5 3 3 3-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div
          className="category-menu-panel"
          id="search-category-options"
          role="menu"
          aria-label="Search categories"
          onKeyDown={(event) => {
            const index = items.current.indexOf(document.activeElement as HTMLButtonElement);
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              trigger.current?.focus();
            } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? categories.length - 1
                    : (index + (event.key === "ArrowDown" ? 1 : -1) + categories.length) %
                      categories.length;
              items.current[next]?.focus();
            }
          }}
        >
          <div className="category-menu-caption" aria-hidden="true">
            Search in
          </div>
          {categories.map((category, index) => (
            <button
              key={category}
              ref={(node) => {
                items.current[index] = node;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={current === category}
              onClick={() => {
                setSelected(category);
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              <span>{category}</span>
              {current === category && (
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="m3 8 3 3 7-7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
