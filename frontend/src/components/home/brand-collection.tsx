"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

// Adapted from the supplied Stitch homepage reference.
export function BrandCollection() {
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const cards = element.querySelectorAll<HTMLElement>(".brand-logo-card");
    cards.forEach((card, index) => card.style.setProperty("--brand-delay", `${index * 65}ms`));
    const observer = new IntersectionObserver(([entry]) => {
      element.dataset.moving = String(entry.isIntersecting);
      if (entry.isIntersecting) element.dataset.revealed = "true";
    }, { threshold: 0.15 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
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
              <span className="material-symbols-outlined text-[16px] text-success-emerald" aria-hidden="true">
                {"verified"}
              </span>
              {"Official Warranties"}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
          <div className="brand-logo-card bg-surface-canvas p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-center text-center h-16" title="Apple">
            <Image src="/images/homepage/brands/apple.svg" alt="Apple" width={160} height={48} unoptimized className="brand-logo brand-logo-apple" />
          </div>
          <div className="brand-logo-card bg-surface-canvas p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-center text-center h-16" title="Samsung">
            <Image src="/images/homepage/brands/samsung.svg" alt="Samsung" width={160} height={48} unoptimized className="brand-logo brand-logo-samsung" />
          </div>
          <div className="brand-logo-card bg-surface-canvas p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-center text-center h-16" title="OnePlus">
            <Image src="/images/homepage/brands/oneplus.svg" alt="OnePlus" width={160} height={48} unoptimized className="brand-logo brand-logo-oneplus" />
          </div>
          <div className="brand-logo-card bg-surface-canvas p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-center text-center h-16" title="vivo">
            <Image src="/images/homepage/brands/vivo.svg" alt="vivo" width={160} height={48} unoptimized className="brand-logo brand-logo-vivo" />
          </div>
          <div className="brand-logo-card bg-surface-canvas p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-center text-center h-16" title="OPPO">
            <Image src="/images/homepage/brands/oppo.webp" alt="OPPO" width={160} height={48} unoptimized className="brand-logo brand-logo-oppo" />
          </div>
          <div className="brand-logo-card bg-surface-canvas p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-center text-center h-16" title="motorola">
            <Image src="/images/homepage/brands/motorola.webp" alt="motorola" width={160} height={48} unoptimized className="brand-logo brand-logo-motorola" />
          </div>
          <div className="brand-logo-card bg-surface-canvas p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-center text-center h-16" title="Xiaomi">
            <Image src="/images/homepage/brands/xiaomi.webp" alt="Xiaomi" width={160} height={48} unoptimized className="brand-logo brand-logo-xiaomi" />
          </div>
          <div className="brand-logo-card bg-surface-canvas p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-center text-center h-16" title="realme">
            <Image src="/images/homepage/brands/realme.svg" alt="realme" width={160} height={48} unoptimized className="brand-logo brand-logo-realme" />
          </div>
          <div className="brand-logo-card bg-surface-canvas p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-center text-center h-16" title="Nothing">
            <Image src="/images/homepage/brands/nothing.svg" alt="Nothing" width={160} height={48} unoptimized className="brand-logo brand-logo-nothing" />
          </div>
          <div className="brand-logo-card bg-surface-canvas p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-center text-center h-16" title="POCO">
            <Image src="/images/homepage/brands/poco.webp" alt="POCO" width={160} height={48} unoptimized className="brand-logo brand-logo-poco" />
          </div>
          <div className="brand-logo-card bg-surface-canvas p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-center text-center h-16" title="HP">
            <Image src="/images/homepage/brands/hp.svg" alt="HP" width={160} height={48} unoptimized className="brand-logo brand-logo-hp" />
          </div>
          <div className="brand-logo-card bg-surface-canvas p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-center text-center h-16" title="Haier">
            <Image src="/images/homepage/brands/haier.webp" alt="Haier" width={160} height={48} unoptimized className="brand-logo brand-logo-haier" />
          </div>
          <div className="brand-logo-card bg-surface-canvas p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-center text-center h-16" title="3DOT">
            <Image src="/images/homepage/brands/3dot.webp" alt="3DOT" width={160} height={48} unoptimized className="brand-logo brand-logo-3dot" />
          </div>
          <div className="brand-logo-card bg-surface-canvas p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-center text-center h-16" title="Bose">
            <Image src="/images/homepage/brands/bose.svg" alt="Bose" width={160} height={48} unoptimized className="brand-logo brand-logo-bose" />
          </div>
          <div className="brand-logo-card bg-surface-canvas p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-center text-center h-16" title="Marshall">
            <Image src="/images/homepage/brands/marshall.svg" alt="Marshall" width={160} height={48} unoptimized className="brand-logo brand-logo-marshall" />
          </div>
          <div className="brand-logo-card bg-surface-canvas p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-center text-center h-16" title="boAt">
            <Image src="/images/homepage/brands/boat.svg" alt="boAt" width={160} height={48} unoptimized className="brand-logo brand-logo-boat" />
          </div>
        </div>
      </div>
    </section>
  );
}
