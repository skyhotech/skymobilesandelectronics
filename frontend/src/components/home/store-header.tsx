"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { SearchCategoryMenu } from "./search-category-menu";
import type { HomepageCategory } from "@/lib/categories";
import { useLiveCategories } from "@/lib/live-categories";

export function StoreHeader({ categories: initialCategories }: { categories: HomepageCategory[] }) {
  const { categories } = useLiveCategories(initialCategories);
  const navigation = [
    ["Shop Products", "/products"],
    ["All Categories", "#categories"],
    ...categories.filter((item) => !item.parent).map((item) => [item.name, item.destination]),
    ["Top Brands", "#brands"],
    ["Deals & Offers", "#offers"],
    ["Store Locator", "#contact"],
  ];
  const header = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!header.current) return;
    const observer = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty(
        "--sky-header-height",
        `${entry.target.getBoundingClientRect().height}px`,
      );
    });
    observer.observe(header.current);
    return () => observer.disconnect();
  }, []);

  return (
    <header ref={header} className="store-header">
      <div className="store-utility">
        <div className="store-header-container">
          <span>
            SKY Mobile &amp; Electronics{" "}
            <span className="utility-detail">· Trusted since 2001</span>
          </span>
          <a href="tel:+919842320212">
            Need help? <strong>+91 98423 20212</strong>
          </a>
        </div>
      </div>
      <div className="store-header-main store-header-container">
        <a href="#main-content" className="store-brand" aria-label="SKY Mobile & Electronics home">
          <Image
            unoptimized
            src="/images/homepage/545193f58191.webp"
            alt="SKY Mobile logo"
            width={80}
            height={80}
            loading="eager"
          />
          <span>
            <strong>SKY MOBILE</strong>
            <small>&amp; Electronics</small>
          </span>
        </a>
        <div className="store-search">
          <SearchCategoryMenu entries={categories} />
          <input
            type="search"
            id="product-search"
            aria-label="Search products"
            placeholder="Search mobiles, laptops, gadgets and more"
          />
          <button type="button" data-action="search" aria-label="Search products">
            <span className="material-symbols-outlined" aria-hidden="true">
              search
            </span>
          </button>
        </div>
        <div className="store-actions">
          <a href="#contact" data-path="login" data-action="login" aria-label="Account">
            <span className="material-symbols-outlined" aria-hidden="true">
              person
            </span>
            <small>Account</small>
          </a>
          <a href="#contact" data-path="wishlist" data-action="wishlist" aria-label="Wishlist">
            <span className="material-symbols-outlined" aria-hidden="true">
              favorite
            </span>
            <span className="store-count" hidden>
              0
            </span>
            <small>Wishlist</small>
          </a>
          <a href="#contact" data-path="cart" data-action="cart" aria-label="Shopping bag">
            <span className="material-symbols-outlined" aria-hidden="true">
              shopping_bag
            </span>
            <small>Bag</small>
          </a>
          <a
            href="#contact"
            data-path="store-locator"
            className="store-locator-button"
            aria-label="Store Locator"
            title="Find a SKY store"
            onClick={() => setMenuOpen(false)}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            <span>Store Locator</span>
          </a>
          <button
            type="button"
            className="store-menu-toggle"
            aria-label={menuOpen ? "Close categories" : "Browse categories"}
            aria-expanded={menuOpen}
            aria-controls="store-navigation"
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {menuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>
      <div className={`store-navigation-shell${menuOpen ? " is-open" : ""}`}>
        <nav
          id="store-navigation"
          className="store-navigation store-header-container"
          aria-label="Shop categories"
        >
          {navigation.map(([label, href]) => (
            <a key={label} href={href} onClick={() => setMenuOpen(false)}>
              {label}
              {label === "3DOT Audio & Gadgets" && <span className="store-hot">Hot</span>}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
