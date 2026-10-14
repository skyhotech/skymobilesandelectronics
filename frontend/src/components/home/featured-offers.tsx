// Adapted from the supplied Stitch homepage reference.
export function FeaturedOffers() {
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-12 py-6 w-full" id="offers">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="relative overflow-hidden rounded-3xl bg-navy-deep text-on-primary p-8 lg:p-10 flex flex-col justify-between shadow-xl min-h-[360px]">
          <div className="absolute -right-12 -bottom-10 w-72 h-72 rounded-full bg-secondary-container/20 blur-3xl"></div>
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary font-label-sm text-label-sm font-bold uppercase tracking-wider">
              {"⚡ Deal of the Day — 38% OFF"}
            </div>
            <h3 className="font-display-lg text-display-lg font-bold leading-tight">
              {'Haier 55" 4K QLED'}
              <br />
              <span className="text-tertiary-fixed">{"Google TV (LE55S60QX)"}</span>
            </h3>
            <p className="font-body-md text-body-md text-tertiary-fixed-dim max-w-md">
              {
                "Dolby Vision & Atmos, 120Hz DLG motion refresh rate, hands-free Google Assistant & bezel-less metal body."
              }
            </p>
            <div className="flex items-baseline gap-3 pt-2">
              <span className="font-price-hero text-price-hero font-extrabold text-on-primary">
                {"₹48,990"}
              </span>
              <span className="font-body-lg text-body-lg text-text-muted line-through">
                {"₹78,990"}
              </span>
              <span className="text-secondary-fixed-dim font-label-lg text-label-lg font-semibold">
                {"Save ₹30,000"}
              </span>
            </div>
          </div>
          <div className="relative z-10 pt-6">
            <a
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary-container hover:bg-crimson-deep text-on-secondary font-label-lg text-label-lg shadow-lg transition-all"
              data-path="tvs-and-soundbars"
              href="#entertainment"
            >
              <span className="">{"Grab TV Deal Now"}</span>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                {"shopping_bag"}
              </span>
            </a>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-primary text-on-primary p-8 lg:p-10 flex flex-col justify-between shadow-xl min-h-[360px]">
          <div className="absolute -right-8 -top-8 w-64 h-64 rounded-full bg-tertiary-fixed/10 blur-2xl"></div>
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-highest/20 text-tertiary-fixed font-label-sm text-label-sm font-bold uppercase tracking-wider">
              {"🎵 House Brand Spotlight"}
            </div>
            <h3 className="font-display-lg text-display-lg font-bold leading-tight">
              {"3DOT Sound Evolution"}
              <br />
              <span className="text-secondary-fixed-dim">{"Bubble & Hubble RGB"}</span>
            </h3>
            <p className="font-body-md text-body-md text-tertiary-fixed-dim max-w-md">
              {
                "Dual driver acoustic architecture, party lights synchronization, Bluetooth 5.4 with TWS and up to 14 hours battery."
              }
            </p>
            <div className="flex items-baseline gap-3 pt-2">
              <span className="font-price-hero text-price-hero font-extrabold text-on-primary">
                {"From ₹990"}
              </span>
              <span className="font-body-lg text-body-lg text-text-muted line-through">
                {"₹3,990"}
              </span>
              <span className="text-secondary-fixed-dim font-label-lg text-label-lg font-semibold">
                {"Flat 75% OFF"}
              </span>
            </div>
          </div>
          <div className="relative z-10 pt-6">
            <a
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-canvas text-primary hover:bg-surface-subtle font-label-lg text-label-lg shadow-lg transition-all"
              data-path="3dot-audio-gadgets"
              href="#gadgets"
            >
              <span className="">{"Explore 3DOT Audio"}</span>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                {"volume_up"}
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
