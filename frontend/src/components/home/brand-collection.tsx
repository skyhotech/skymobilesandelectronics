"use client";

import { useEffect, useRef } from "react";
import { MediaImage } from "@/components/media/media-image";
import type { HomepageBrand } from "@/lib/brands";
import { useLiveBrands } from "@/lib/live-brands";

// Adapted from the supplied Stitch homepage reference. Brands are managed in
// /management/admin/brands (active + "Show on homepage", ordered by display order).
export function BrandCollection({ brands: initialBrands }: { brands: HomepageBrand[] }) {
  const { brands, error } = useLiveBrands(initialBrands);
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const cards = element.querySelectorAll<HTMLElement>(".brand-logo-card");
    cards.forEach((card, index) => card.style.setProperty("--brand-delay", `${index * 65}ms`));
    const observer = new IntersectionObserver(
      ([entry]) => {
        element.dataset.moving = String(entry.isIntersecting);
        if (entry.isIntersecting) element.dataset.revealed = "true";
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [brands]);
  if (!brands.length && !error) return null;
  return (
    <section ref={section} className="w-full bg-surface-subtle py-12" id="brands">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-bold">
              {"Authorized Retail Partner"}
            </span>
            <h2 className="font-headline-sm text-headline-sm font-bold text-primary">
              {"Shop Your Favourite Brands"}
            </h2>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-surface-canvas text-primary font-label-sm text-label-sm shadow-sm flex items-center gap-1 font-semibold">
              <span
                className="material-symbols-outlined text-[16px] text-success-emerald"
                aria-hidden="true"
              >
                {"verified"}
              </span>
              {"Official Warranties"}
            </span>
          </div>
        </div>
        {error && <p role="status">Brand updates are temporarily unavailable. Retrying automatically.</p>}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className="brand-logo-card bg-surface-canvas p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-center text-center h-16"
              title={brand.name}
            >
              <MediaImage
                src={brand.logo_url}
                alt={brand.name}
                width={160}
                height={48}
                sizes="120px"
                className={`brand-logo brand-logo-${brand.slug}`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
