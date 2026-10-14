"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const names = [
  "HDFC Bank",
  "TVS Credit",
  "Bajaj Finserv",
  "IDFC FIRST Bank",
  "HDB Financial Services",
  "ICICI Bank",
  "Axis Bank",
  "Marutham Group",
  "Indian Bank",
  "State Bank of India",
  "City Union Bank",
  "Bank of Baroda",
  "Kotak Mahindra Bank",
  "Kotak Mahindra Bank",
  "Marutham Group",
];
const partners = names.map((name, index) => ({
  name,
  file:
    index < 13
      ? `Finance_Partner_${String(index + 1).padStart(2, "0")}`
      : index === 13
        ? "kotak"
        : "marutham group",
}));
const rows = [partners.filter((_, i) => i % 2 === 0), partners.filter((_, i) => i % 2 === 1)];

export function FinancePartnerCarousel() {
  const viewport = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!viewport.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={viewport} className="finance-carousel" data-paused={!visible}>
      <div className="finance-viewport" aria-label="Finance and payment partner logos">
        {rows.map((row, rowIndex) => (
          <div className="finance-row" key={rowIndex}>
            <div className={`finance-track finance-track-${rowIndex}`}>
              {[0, 1].map((copy) => (
                <div
                  className="finance-group"
                  key={copy}
                  aria-hidden={copy === 1 ? true : undefined}
                >
                  {row.map((partner, index) => (
                    <div className="finance-logo-card" key={partner.file}>
                      <div
                        className="finance-logo-window"
                        style={{ animationDelay: `${index * -0.6}s` }}
                      >
                        <Image
                          src={`/images/homepage/finance-optimized/${encodeURIComponent(partner.file)}.webp`}
                          alt={copy === 0 ? partner.name : ""}
                          width={480}
                          height={274}
                          unoptimized
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
  );
}
