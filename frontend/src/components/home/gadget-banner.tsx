"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

// Disjoint rows: each product occurs once before its seamless loop copy.
const rows = [
  [
    "televisions",
    "air-conditioner",
    "fridge",
    "washing-machine",
    "desktop-pc",
    "laptops",
    "tablet",
    "tv-streamer",
    "smart-thermostat",
  ],
  [
    "phone-cutout",
    "earbuds",
    "headphones",
    "watches",
    "3dot-basspop",
    "3dot-arion",
    "smart-speaker",
    "cloud-controller",
    "indoor-camera",
  ],
  [
    "speakers",
    "mouse",
    "keyboard",
    "trackpad",
    "stylus",
    "usb-hub",
    "usb-cable",
    "game-controller",
    "climate-sensor",
  ],
  [
    "chargers",
    "power-banks",
    "magsafe",
    "phone-case",
    "tracker-keyring",
    "tablet-keyboard",
    "mobile-controller",
    "tv-remote",
    "video-doorbell",
  ],
];

export function GadgetBanner() {
  const banner = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = banner.current;
    if (!element) return;
    const update = (visible: boolean) => {
      element.dataset.moving = String(visible && !document.hidden);
    };
    let inView = true;
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update(inView);
    });
    const visibility = () => update(inView);
    observer.observe(element);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  return (
    <section
      ref={banner}
      id="gadget-banner"
      className="sky-gadget-banner"
      aria-label="SKY Mobile and Electronics - technology for every day"
    >
      <div className="gadget-pattern-motion" aria-hidden="true">
        <div className="gadget-pattern">
          {rows.map((row, rowIndex) => (
            <div className="gadget-row" key={rowIndex}>
              <div className={`gadget-train gadget-direction-${rowIndex % 2}`}>
                {[0, 1].map((copy) => (
                  <div className="gadget-train-group" key={copy} data-copy={copy}>
                    {row.map((gadget, index) => (
                      <div
                        className={`gadget-pattern-item gadget-size-${index % 4}`}
                        key={gadget}
                        data-gadget={gadget}
                      >
                        <div
                          className="gadget-product"
                          style={{ animationDelay: `${(index + rowIndex) * -0.4}s` }}
                        >
                          <Image
                            src={`/images/homepage/banner-gadgets-hq/${gadget}.webp`}
                            alt=""
                            width={640}
                            height={640}
                            unoptimized
                            loading="eager"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="gadget-banner-light" aria-hidden="true" />
      <div className="gadget-banner-logo">
        <Image
          src="/images/homepage/545193f58191.webp"
          alt="SKY Mobile & Electronics - Since 2001"
          width={450}
          height={450}
          unoptimized
          loading="eager"
        />
      </div>
    </section>
  );
}
