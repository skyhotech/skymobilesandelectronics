"use client";

import { useEffect, useRef, useState, type ReactNode, type MouseEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type Product = { title: string; price: string; description: string; image: string };
type Panel = { title: string; message?: string; product?: Product; saved?: Product[] };

function readProduct(element: Element): Product | undefined {
  // Cards from the design remain server-rendered. The enquiry island reads their visible content.
  let card = element.closest<HTMLElement>("[data-product]");
  if (!card) {
    let parent = element.parentElement;
    while (parent && parent.tagName !== "SECTION") {
      if (parent.querySelector("h3,h4") && parent.querySelector("img")) {
        card = parent;
        break;
      }
      parent = parent.parentElement;
    }
  }
  if (!card) return;
  return {
    title:
      card.dataset.product || card.querySelector("h3,h4")?.textContent?.trim() || "Product enquiry",
    price:
      card.querySelector(".font-price-card,.font-price-hero")?.textContent?.trim() ||
      "Contact us for pricing",
    description:
      card.querySelector("p")?.textContent?.trim() ||
      "Ask our team about specifications and availability.",
    image: card.querySelector("img")?.getAttribute("src") || "",
  };
}

export function HomepageInteractions({ children }: { children: ReactNode }) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const saved = useRef<Record<string, Product>>({});

  useEffect(() => {
    try {
      const data: unknown = JSON.parse(localStorage.getItem("sky-saved-products") || "{}");
      if (data && typeof data === "object" && !Array.isArray(data)) {
        for (const [id, value] of Object.entries(data)) {
          if (
            value &&
            typeof value === "object" &&
            typeof value.title === "string" &&
            typeof value.image === "string" &&
            value.image.startsWith("/images/homepage/") &&
            typeof value.price === "string" &&
            typeof value.description === "string"
          ) {
            saved.current[id] = value;
          }
        }
      }
    } catch {
      // Storage may be disabled; saving remains usable for the current page visit.
    }
    updateSavedIndicators();
  }, []);

  useEffect(() => {
    if (panel && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [panel]);

  function updateSavedIndicators() {
    const host = root.current;
    host
      ?.querySelectorAll<HTMLElement>('[data-path="wishlist"] > span:nth-child(2)')
      .forEach((badge) => {
        badge.textContent = String(Object.keys(saved.current).length);
        badge.hidden = Object.keys(saved.current).length === 0;
      });
    host?.querySelectorAll<HTMLElement>('[data-action="wishlist-product"]').forEach((button) => {
      const id = button.closest<HTMLElement>("[data-product]")?.dataset.productId;
      const selected = id !== undefined && Boolean(saved.current[id]);
      button.setAttribute("aria-pressed", String(selected));
      button.setAttribute("aria-label", selected ? "Remove from Wishlist" : "Add to Wishlist");
      button.classList.toggle("is-saved", selected);
    });
  }

  function searchProducts() {
    const host = root.current;
    const query = host?.querySelector<HTMLInputElement>("#product-search")?.value.trim().slice(0, 120) || "";
    const category = host?.querySelector<HTMLSelectElement>("#search-category")?.selectedOptions[0]?.dataset.slug;
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (category) params.set("category", category);
    router.push(`/products${params.size ? `?${params}` : ""}`);
  }

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLElement>("[data-action]");
    if (button) {
      event.preventDefault();
      const action = button.dataset.action;
      if (action === "categories") {
        root.current?.querySelector("#categories")?.scrollIntoView({ behavior: "smooth" });
      } else if (action === "search") {
        searchProducts();
      } else if (action === "wishlist-product") {
        const id = button.closest<HTMLElement>("[data-product]")?.dataset.productId;
        const product = readProduct(button);
        if (id === undefined || !product) return;
        if (saved.current[id]) delete saved.current[id];
        else saved.current[id] = product;
        try {
          localStorage.setItem("sky-saved-products", JSON.stringify(saved.current));
        } catch {
          setAnnouncement("Saved for this visit. Your browser does not allow persistent storage.");
        }
        updateSavedIndicators();
        setAnnouncement(
          saved.current[id]
            ? `${product.title} saved on this device.`
            : `${product.title} removed from saved products.`,
        );
      } else if (action === "wishlist") {
        setPanel({
          title: "Your wishlist",
          saved: Object.values(saved.current),
          message: "Products saved on this device. Confirm current prices and stock with SKY.",
        });
      } else if (action === "enquire" || action === "details") {
        const product = readProduct(button);
        setPanel(
          product
            ? { title: product.title, product }
            : {
                title: "Find your next upgrade",
                message:
                  "Contact the SKY team for current specifications, prices, exchange offers and availability.",
              },
        );
      } else {
        const titles: Record<string, string> = {
          login: "Your SKY account",
          cart: "Your shopping bag",
          compare: "Compare your next upgrade",
          "track-order": "Track your order",
        };
        setPanel({
          title: titles[action || ""] || "Contact SKY",
          message:
            action === "compare"
              ? "Our specialists can help you compare specifications and choose the right device. Contact SKY for advice."
              : "Online accounts and ordering are coming soon. Contact SKY for shopping assistance or an existing order.",
        });
      }
      return;
    }
    const tab = target.closest<HTMLButtonElement>("#mobile-tabs button");
    if (tab) {
      const label = tab.textContent?.trim() || "All Mobiles";
      root.current?.querySelectorAll<HTMLButtonElement>("#mobile-tabs button").forEach((item) => {
        const active = item === tab;
        item.classList.toggle("bg-navy-deep", active);
        item.classList.toggle("text-on-primary", active);
        item.classList.toggle("bg-surface-subtle", !active);
        item.classList.toggle("text-text-secondary", !active);
        item.setAttribute("aria-pressed", String(active));
      });
      root.current
        ?.querySelectorAll<HTMLElement>("#smartphones [data-product]")
        .forEach((card, index) => {
          const title = card.dataset.product || "";
          card.hidden =
            label === "Fold & Flip"
              ? !/fold|flip/i.test(title)
              : label === "Flagship AI"
                ? !/s24|s25|fold|flip/i.test(title)
                : label === "Best Sellers"
                  ? index > 3
                  : false;
        });
      setAnnouncement(`Showing ${label.toLowerCase()}.`);
    }
  }

  return (
    <div
      ref={root}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" && (event.target as HTMLElement).id === "product-search")
          searchProducts();
      }}
    >
      {children}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      <dialog
        ref={dialog}
        className="sky-dialog"
        aria-labelledby="dialog-title"
        onClose={() => setPanel(null)}
        onCancel={() => setPanel(null)}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="p-6 sm:p-8">
          <button
            type="button"
            className="dialog-close"
            aria-label="Close dialog"
            onClick={() => dialog.current?.close()}
          >
            <span aria-hidden="true">×</span>
          </button>
          <h2 id="dialog-title" className="text-headline-md font-bold text-primary pr-8">
            {panel?.title}
          </h2>
          {panel?.message && (
            <p className="mt-4 text-body-md text-text-secondary">{panel.message}</p>
          )}
          {panel?.product && (
            <div className="mt-5">
              {panel.product.image && (
                <Image
                  unoptimized
                  src={panel.product.image}
                  alt={panel.product.title}
                  width={400}
                  height={300}
                  className="mx-auto h-56 w-full rounded-xl object-contain bg-surface-subtle"
                />
              )}
              <p className="mt-4 text-body-md text-text-secondary">{panel.product.description}</p>
              <p className="mt-3 text-price-card font-bold text-primary">{panel.product.price}</p>
              <p className="mt-2 text-body-sm text-text-secondary">
                Reference offer. Confirm current price, stock and warranty with SKY. Online checkout
                is not available yet.
              </p>
            </div>
          )}
          {panel?.saved && (
            <ul className="mt-5 space-y-4">
              {panel.saved.length === 0 && (
                <li className="text-text-secondary">Tap a heart on a product to save it here.</li>
              )}
              {panel.saved.map((product) => (
                <li
                  key={product.title}
                  className="flex items-center gap-4 rounded-xl bg-surface-subtle p-3"
                >
                  <Image
                    unoptimized
                    src={product.image}
                    alt=""
                    width={64}
                    height={64}
                    className="h-16 w-16 object-contain"
                  />
                  <div>
                    <h3 className="font-semibold text-primary">{product.title}</h3>
                    <p className="text-body-sm text-text-secondary">{product.price}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`https://wa.me/919842320212?text=${encodeURIComponent(panel?.product ? `Hi SKY, I would like to enquire about ${panel.product.title}. Please confirm the current price and availability.` : "Hi SKY, I would like some shopping assistance.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-secondary-container px-5 py-3 text-label-lg font-semibold text-white"
            >
              Enquire on WhatsApp
            </a>
            <a
              href="tel:+919842320212"
              className="rounded-xl bg-navy-tint px-5 py-3 text-label-lg font-semibold text-primary"
            >
              Call SKY
            </a>
          </div>
        </div>
      </dialog>
    </div>
  );
}
