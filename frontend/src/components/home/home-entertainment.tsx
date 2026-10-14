import Image from "next/image";

// Adapted from the supplied Stitch homepage reference.
export function HomeEntertainment() {
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-12 py-16 w-full" id="entertainment">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <span className="text-secondary font-label-sm text-label-sm uppercase tracking-wider font-bold">
            {"Living Room Cinema & Home"}
          </span>
          <h2 className="font-headline-lg text-headline-lg font-bold text-primary">
            {"Cinematic Entertainment & Appliances"}
          </h2>
          <p className="font-body-md text-body-md text-text-secondary mt-1">
            {"4K Ultra HD screens, Dolby sound & power-efficient home comfort"}
          </p>
        </div>
        <a className="font-label-lg text-label-lg font-semibold text-navy-light hover:text-crimson-vibrant inline-flex items-center gap-1 group" data-path="tvs-and-soundbars" href="#entertainment">
          <span className="">
            {"Explore All Televisions"}
          </span>
          <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform" aria-hidden="true">
            {"arrow_forward"}
          </span>
        </a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-canvas rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group" data-product={"Haier LE43A900UG 4K UHD"} data-product-id="17">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="bg-badge-discount text-on-secondary font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-bold">
                {"-13% OFF"}
              </span>
              <span className="text-text-muted font-label-sm text-label-sm font-semibold">
                {"43\" 4K UHD"}
              </span>
            </div>
            <div className="h-44 bg-surface-subtle rounded-xl p-3 flex items-center justify-center mb-4 overflow-hidden">
              <Image unoptimized className="h-full object-contain group-hover:scale-105 transition-transform" data-alt="Haier LE43A900UG 43-inch smart 4K LED TV on metal stand displaying high dynamic color video" src="/images/homepage/0556e754bab1.webp" alt="Haier LE43A900UG 43-inch smart 4K LED TV on metal stand displaying high dynamic color video" width="512" height="279" loading="lazy" decoding="async" />
            </div>
            <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">
              {"Haier • Smart TV"}
            </span>
            <h4 className="font-title-md text-title-md font-bold text-primary mt-1 line-clamp-1 group-hover:text-secondary transition-colors">
              {"Haier LE43A900UG 4K UHD"}
            </h4>
            <p className="font-body-sm text-body-sm text-text-secondary mt-1 line-clamp-2">
              {"Integrated Smart platform, multi HDMI/USB ports, crisp 4K Ultra HD clarity."}
            </p>
          </div>
          <div className="mt-4 pt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-price-card text-price-card font-extrabold text-primary">
                {"₹28,990"}
              </span>
              <span className="font-body-sm text-body-sm text-text-muted line-through">
                {"₹33,490"}
              </span>
            </div>
            <button className="w-full mt-3 py-2.5 rounded-xl bg-primary hover:bg-navy-light text-on-primary font-label-sm text-label-sm font-semibold transition-colors" type="button" data-action="enquire">
              {"Add to Cart"}
            </button>
          </div>
        </div>
        <div className="bg-surface-canvas rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group" data-product={"Haier P7GT 43\" 4K Google TV"} data-product-id="18">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="bg-badge-discount text-on-secondary font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-bold">
                {"-24% OFF"}
              </span>
              <span className="text-secondary font-label-sm text-label-sm font-bold">
                {"Dolby Atmos"}
              </span>
            </div>
            <div className="h-44 bg-surface-subtle rounded-xl p-3 flex items-center justify-center mb-4 overflow-hidden">
              <Image unoptimized className="h-full object-contain group-hover:scale-105 transition-transform" data-alt="Haier P7GT 43 inch bezel less 4K Google TV showing vivid nature film scene" src="/images/homepage/6d46dca65357.webp" alt="Haier P7GT 43 inch bezel less 4K Google TV showing vivid nature film scene" width="512" height="279" loading="lazy" decoding="async" />
            </div>
            <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">
              {"Haier • Google TV"}
            </span>
            <h4 className="font-title-md text-title-md font-bold text-primary mt-1 line-clamp-1 group-hover:text-secondary transition-colors">
              {"Haier P7GT 43\" 4K Google TV"}
            </h4>
            <p className="font-body-sm text-body-sm text-text-secondary mt-1 line-clamp-2">
              {"Dolby Vision & Atmos, Hands-Free Voice Control, 2GB RAM + 32GB ROM."}
            </p>
          </div>
          <div className="mt-4 pt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-price-card text-price-card font-extrabold text-primary">
                {"₹35,990"}
              </span>
              <span className="font-body-sm text-body-sm text-text-muted line-through">
                {"₹47,590"}
              </span>
            </div>
            <button className="w-full mt-3 py-2.5 rounded-xl bg-primary hover:bg-navy-light text-on-primary font-label-sm text-label-sm font-semibold transition-colors" type="button" data-action="enquire">
              {"Add to Cart"}
            </button>
          </div>
        </div>
        <div className="bg-surface-canvas rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group" data-product={"Haier LE55P7GT 55\" 4K Google TV"} data-product-id="19">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="bg-badge-discount text-on-secondary font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-bold">
                {"-28% OFF"}
              </span>
              <span className="text-text-muted font-label-sm text-label-sm font-semibold">
                {"55\" Screen"}
              </span>
            </div>
            <div className="h-44 bg-surface-subtle rounded-xl p-3 flex items-center justify-center mb-4 overflow-hidden">
              <Image unoptimized className="h-full object-contain group-hover:scale-105 transition-transform" data-alt="Haier 55 inch LE55P7GT 4K Google TV mounted on contemporary stone wall living room" src="/images/homepage/c5a9ef913ebe.webp" alt="Haier 55 inch LE55P7GT 4K Google TV mounted on contemporary stone wall living room" width="512" height="279" loading="lazy" decoding="async" />
            </div>
            <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">
              {"Haier • Google TV"}
            </span>
            <h4 className="font-title-md text-title-md font-bold text-primary mt-1 line-clamp-1 group-hover:text-secondary transition-colors">
              {"Haier LE55P7GT 55\" 4K Google TV"}
            </h4>
            <p className="font-body-sm text-body-sm text-text-secondary mt-1 line-clamp-2">
              {"30W Dolby Atmos speaker system, MEMC smooth motion, sleek metal finish."}
            </p>
          </div>
          <div className="mt-4 pt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-price-card text-price-card font-extrabold text-primary">
                {"₹47,990"}
              </span>
              <span className="font-body-sm text-body-sm text-text-muted line-through">
                {"₹66,490"}
              </span>
            </div>
            <button className="w-full mt-3 py-2.5 rounded-xl bg-primary hover:bg-navy-light text-on-primary font-label-sm text-label-sm font-semibold transition-colors" type="button" data-action="enquire">
              {"Add to Cart"}
            </button>
          </div>
        </div>
        <div className="bg-surface-canvas rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group" data-product={"Haier LE55S60QX 55\" QLED"} data-product-id="20">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="bg-badge-discount text-on-secondary font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-bold">
                {"-38% OFF"}
              </span>
              <span className="text-secondary font-label-sm text-label-sm font-bold">
                {"120Hz DLG QLED"}
              </span>
            </div>
            <div className="h-44 bg-surface-subtle rounded-xl p-3 flex items-center justify-center mb-4 overflow-hidden">
              <Image unoptimized className="h-full object-contain group-hover:scale-105 transition-transform" data-alt="Haier flagship 55 inch QLED Google TV with brilliant color saturation on slim stand" src="/images/homepage/223f6df9f14a.webp" alt="Haier flagship 55 inch QLED Google TV with brilliant color saturation on slim stand" width="512" height="286" loading="lazy" decoding="async" />
            </div>
            <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">
              {"Haier • QLED Flagship"}
            </span>
            <h4 className="font-title-md text-title-md font-bold text-primary mt-1 line-clamp-1 group-hover:text-secondary transition-colors">
              {"Haier LE55S60QX 55\" QLED"}
            </h4>
            <p className="font-body-sm text-body-sm text-text-secondary mt-1 line-clamp-2">
              {"Quantum Dot color vibrancy, Dolby Vision Atmos, DLG 120Hz gaming support."}
            </p>
          </div>
          <div className="mt-4 pt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-price-card text-price-card font-extrabold text-primary">
                {"₹48,990"}
              </span>
              <span className="font-body-sm text-body-sm text-text-muted line-through">
                {"₹78,990"}
              </span>
            </div>
            <button className="w-full mt-3 py-2.5 rounded-xl bg-secondary-container hover:bg-crimson-deep text-on-secondary font-label-sm text-label-sm font-semibold transition-colors shadow-sm" type="button" data-action="enquire">
              {"Add to Cart"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
