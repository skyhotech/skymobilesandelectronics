import Image from "next/image";

// Adapted from the supplied Stitch homepage reference.
export function GadgetCollection() {
  return (
    <section className="w-full bg-primary-container text-on-primary py-16" id="gadgets">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary font-label-sm text-label-sm uppercase tracking-wider mb-2 font-bold">
              {"SKY In-House Brand"}
            </div>
            <h2 className="font-headline-lg text-headline-lg font-bold text-on-primary">
              {"3DOT Gadgets & Signature Audio"}
            </h2>
            <p className="font-body-md text-body-md text-tertiary-fixed-dim mt-1">
              {
                "Pure Sound. Premium Craftsmanship. Everyday Durability. Built specifically for Indian lifestyles."
              }
            </p>
          </div>
          <a
            className="font-label-lg text-label-lg font-semibold text-tertiary-fixed hover:text-white inline-flex items-center gap-1 group"
            data-path="3dot-audio-gadgets"
            href="#gadgets"
          >
            <span className="">{"View All 3DOT Range"}</span>
            <span
              className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform"
              aria-hidden="true"
            >
              {"arrow_forward"}
            </span>
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            className="bg-surface-canvas text-on-surface rounded-2xl p-5 shadow-lg flex flex-col justify-between group"
            data-product={"3DOT MINO Speaker"}
            data-product-id="11"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="bg-badge-discount text-on-secondary font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-bold">
                  {"-76% OFF"}
                </span>
                <span className="text-text-muted font-label-sm text-label-sm">
                  {"Bluetooth 5.4"}
                </span>
              </div>
              <div className="h-44 bg-surface-subtle rounded-xl p-3 flex items-center justify-center mb-4 overflow-hidden">
                <Image
                  unoptimized
                  className="h-full object-contain group-hover:scale-105 transition-transform"
                  data-alt="3DOT Mino compact cylindrical 8W portable Bluetooth speaker with braided lanyard strap in midnight black"
                  src="/images/homepage/4c356c0d46ba.webp"
                  alt="3DOT Mino compact cylindrical 8W portable Bluetooth speaker with braided lanyard strap in midnight black"
                  width="512"
                  height="279"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h4 className="font-title-md text-title-md font-bold text-primary group-hover:text-secondary transition-colors">
                {"3DOT MINO Speaker"}
              </h4>
              <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                {
                  "8W RMS punchy audio, 14 hours battery, TWS dual pairing, FM radio & SD card support."
                }
              </p>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between">
              <div>
                <span className="font-price-card text-price-card font-extrabold text-primary">
                  {"₹790"}
                </span>
                <span className="font-body-sm text-body-sm text-text-muted line-through ml-2">
                  {"₹3,290"}
                </span>
              </div>
              <button
                className="px-4 py-2 rounded-xl bg-secondary-container hover:bg-crimson-deep text-on-secondary font-label-sm text-label-sm font-semibold transition-colors"
                type="button"
                data-action="enquire"
              >
                {"Add to Cart"}
              </button>
            </div>
          </div>
          <div
            className="bg-surface-canvas text-on-surface rounded-2xl p-5 shadow-lg flex flex-col justify-between group"
            data-product={"3DOT HUBBLE Speaker"}
            data-product-id="12"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="bg-badge-discount text-on-secondary font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-bold">
                  {"-78% OFF"}
                </span>
                <span className="text-secondary font-label-sm text-label-sm font-semibold">
                  {"Dual 10W Drivers"}
                </span>
              </div>
              <div className="h-44 bg-surface-subtle rounded-xl p-3 flex items-center justify-center mb-4 overflow-hidden">
                <Image
                  unoptimized
                  className="h-full object-contain group-hover:scale-105 transition-transform"
                  data-alt="3DOT Hubble 20W Bluetooth speaker with vibrant RGB LED light ring glowing during party playback"
                  src="/images/homepage/b0d99419d390.webp"
                  alt="3DOT Hubble 20W Bluetooth speaker with vibrant RGB LED light ring glowing during party playback"
                  width="512"
                  height="279"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h4 className="font-title-md text-title-md font-bold text-primary group-hover:text-secondary transition-colors">
                {"3DOT HUBBLE Speaker"}
              </h4>
              <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                {"20W RMS power, pulsing RGB lights, 2000mAh battery with Type-C fast recharge."}
              </p>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between">
              <div>
                <span className="font-price-card text-price-card font-extrabold text-primary">
                  {"₹1,090"}
                </span>
                <span className="font-body-sm text-body-sm text-text-muted line-through ml-2">
                  {"₹4,990"}
                </span>
              </div>
              <button
                className="px-4 py-2 rounded-xl bg-secondary-container hover:bg-crimson-deep text-on-secondary font-label-sm text-label-sm font-semibold transition-colors"
                type="button"
                data-action="enquire"
              >
                {"Add to Cart"}
              </button>
            </div>
          </div>
          <div
            className="bg-surface-canvas text-on-surface rounded-2xl p-5 shadow-lg flex flex-col justify-between group"
            data-product={"Triangle Party Speaker 120W"}
            data-product-id="13"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="bg-badge-discount text-on-secondary font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-bold">
                  {"-20% OFF"}
                </span>
                <span className="text-text-muted font-label-sm text-label-sm">
                  {"Includes Wireless Mic"}
                </span>
              </div>
              <div className="h-44 bg-surface-subtle rounded-xl p-3 flex items-center justify-center mb-4 overflow-hidden">
                <Image
                  unoptimized
                  className="h-full object-contain group-hover:scale-105 transition-transform"
                  data-alt="3DOT Triangle 120W RMS Party Tower Speaker with dual 6.5 inch subwoofers and karaoke wireless microphone"
                  src="/images/homepage/5acf223e8899.webp"
                  alt="3DOT Triangle 120W RMS Party Tower Speaker with dual 6.5 inch subwoofers and karaoke wireless microphone"
                  width="512"
                  height="279"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h4 className="font-title-md text-title-md font-bold text-primary group-hover:text-secondary transition-colors">
                {"Triangle Party Speaker 120W"}
              </h4>
              <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                {
                  '120W RMS monster sound, dual 6.5" subwoofers, karaoke ready with included wireless mic.'
                }
              </p>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between">
              <div>
                <span className="font-price-card text-price-card font-extrabold text-primary">
                  {"₹7,999"}
                </span>
                <span className="font-body-sm text-body-sm text-text-muted line-through ml-2">
                  {"₹9,999"}
                </span>
              </div>
              <button
                className="px-4 py-2 rounded-xl bg-secondary-container hover:bg-crimson-deep text-on-secondary font-label-sm text-label-sm font-semibold transition-colors"
                type="button"
                data-action="enquire"
              >
                {"Add to Cart"}
              </button>
            </div>
          </div>
          <div
            className="bg-surface-canvas text-on-surface rounded-2xl p-5 shadow-lg flex flex-col justify-between group"
            data-product={"3DOT CURIO Smart Watch"}
            data-product-id="14"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="bg-badge-discount text-on-secondary font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-bold">
                  {"-72% OFF"}
                </span>
                <span className="text-text-muted font-label-sm text-label-sm">
                  {'2.01" 600 Nits'}
                </span>
              </div>
              <div className="h-44 bg-surface-subtle rounded-xl p-3 flex items-center justify-center mb-4 overflow-hidden">
                <Image
                  unoptimized
                  className="h-full object-contain group-hover:scale-105 transition-transform"
                  data-alt="3DOT Curio smartwatch with 2.01 inch bright IPS screen showing digital watch face and silicone strap"
                  src="/images/homepage/37656b85f5e6.webp"
                  alt="3DOT Curio smartwatch with 2.01 inch bright IPS screen showing digital watch face and silicone strap"
                  width="512"
                  height="279"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h4 className="font-title-md text-title-md font-bold text-primary group-hover:text-secondary transition-colors">
                {"3DOT CURIO Smart Watch"}
              </h4>
              <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                {
                  "Bluetooth calling, 600 nits daylight display, continuous heart rate, pedometer & games."
                }
              </p>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between">
              <div>
                <span className="font-price-card text-price-card font-extrabold text-primary">
                  {"₹990"}
                </span>
                <span className="font-body-sm text-body-sm text-text-muted line-through ml-2">
                  {"₹3,490"}
                </span>
              </div>
              <button
                className="px-4 py-2 rounded-xl bg-secondary-container hover:bg-crimson-deep text-on-secondary font-label-sm text-label-sm font-semibold transition-colors"
                type="button"
                data-action="enquire"
              >
                {"Add to Cart"}
              </button>
            </div>
          </div>
          <div
            className="bg-surface-canvas text-on-surface rounded-2xl p-5 shadow-lg flex flex-col justify-between group"
            data-product={"Akiya 35W GaN Dual Charger"}
            data-product-id="15"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="bg-badge-discount text-on-secondary font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-bold">
                  {"-47% OFF"}
                </span>
                <span className="text-text-muted font-label-sm text-label-sm">
                  {"Dual Port Type-C + A"}
                </span>
              </div>
              <div className="h-44 bg-surface-subtle rounded-xl p-3 flex items-center justify-center mb-4 overflow-hidden">
                <Image
                  unoptimized
                  className="h-full object-contain group-hover:scale-105 transition-transform"
                  data-alt="3DOT Akiya 35W GaN Dual Port compact fast charger in pearl white with dual ports"
                  src="/images/homepage/37940a88e8f1.webp"
                  alt="3DOT Akiya 35W GaN Dual Port compact fast charger in pearl white with dual ports"
                  width="512"
                  height="279"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h4 className="font-title-md text-title-md font-bold text-primary group-hover:text-secondary transition-colors">
                {"Akiya 35W GaN Dual Charger"}
              </h4>
              <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                {
                  "GaN III semiconductor, PD3.0 PPS, SuperVOOC & Dash support for smartphones & iPads."
                }
              </p>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between">
              <div>
                <span className="font-price-card text-price-card font-extrabold text-primary">
                  {"₹790"}
                </span>
                <span className="font-body-sm text-body-sm text-text-muted line-through ml-2">
                  {"₹1,490"}
                </span>
              </div>
              <button
                className="px-4 py-2 rounded-xl bg-secondary-container hover:bg-crimson-deep text-on-secondary font-label-sm text-label-sm font-semibold transition-colors"
                type="button"
                data-action="enquire"
              >
                {"Add to Cart"}
              </button>
            </div>
          </div>
          <div
            className="bg-surface-canvas text-on-surface rounded-2xl p-5 shadow-lg flex flex-col justify-between group"
            data-product={"NAP 10 2.0 Powerbank"}
            data-product-id="16"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="bg-badge-discount text-on-secondary font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-bold">
                  {"-40% OFF"}
                </span>
                <span className="text-text-muted font-label-sm text-label-sm">
                  {"22.5W Fast Charge"}
                </span>
              </div>
              <div className="h-44 bg-surface-subtle rounded-xl p-3 flex items-center justify-center mb-4 overflow-hidden">
                <Image
                  unoptimized
                  className="h-full object-contain group-hover:scale-105 transition-transform"
                  data-alt="3DOT NAP 10 2.0 10000mAh Power Bank with digital LED percentage display and slim matte shell"
                  src="/images/homepage/cb2f2c84f52e.webp"
                  alt="3DOT NAP 10 2.0 10000mAh Power Bank with digital LED percentage display and slim matte shell"
                  width="512"
                  height="279"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h4 className="font-title-md text-title-md font-bold text-primary group-hover:text-secondary transition-colors">
                {"NAP 10 2.0 Powerbank"}
              </h4>
              <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                {
                  "10000mAh Lithium-Polymer, Triple Output (Type-C + Dual USB), Smart LED numerical meter."
                }
              </p>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between">
              <div>
                <span className="font-price-card text-price-card font-extrabold text-primary">
                  {"₹890"}
                </span>
                <span className="font-body-sm text-body-sm text-text-muted line-through ml-2">
                  {"₹1,490"}
                </span>
              </div>
              <button
                className="px-4 py-2 rounded-xl bg-secondary-container hover:bg-crimson-deep text-on-secondary font-label-sm text-label-sm font-semibold transition-colors"
                type="button"
                data-action="enquire"
              >
                {"Add to Cart"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
