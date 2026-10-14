import Image from "next/image";

// Adapted from the supplied Stitch homepage reference.
export function LaptopCollection() {
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-12 py-16 w-full" id="laptops">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <span className="text-secondary font-label-sm text-label-sm uppercase tracking-wider font-bold">
            {"Computing & Productivity"}
          </span>
          <h2 className="font-headline-lg text-headline-lg font-bold text-primary">
            {"Power Your Everyday — Laptops & Tablets"}
          </h2>
          <p className="font-body-md text-body-md text-text-secondary mt-1">
            {"From work to play — find your perfect laptop match with preloaded MS Office 2024"}
          </p>
        </div>
        <a className="font-label-lg text-label-lg font-semibold text-navy-light hover:text-crimson-vibrant inline-flex items-center gap-1 group" data-path="laptops-and-tablets" href="#laptops">
          <span className="">
            {"View All Laptops"}
          </span>
          <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform" aria-hidden="true">
            {"arrow_forward"}
          </span>
        </a>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 bg-navy-tint rounded-3xl p-6 lg:p-8 flex flex-col justify-between shadow-sm relative overflow-hidden group" data-product={"HP OmniBook 3 AMD Ryzen AI 5 340"} data-product-id="21">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="bg-navy-deep text-on-primary font-label-sm text-label-sm px-3 py-1 rounded-full font-bold">
                {"Copilot+ AI Laptop"}
              </span>
              <span className="bg-badge-discount text-on-secondary font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-bold">
                {"-15% OFF"}
              </span>
            </div>
            <div>
              <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider font-semibold">
                {"HP OmniBook Series"}
              </span>
              <h3 className="font-headline-md text-headline-md font-bold text-primary mt-1">
                {"HP OmniBook 3 AMD Ryzen AI 5 340"}
              </h3>
              <p className="font-body-md text-body-md text-text-secondary mt-2">
                {"Next-gen AMD Ryzen AI 5 processor, 16GB DDR5 RAM, 512GB PCIe NVMe SSD, 1080p FHD camera with AI background blur and 10 hours battery life."}
              </p>
            </div>
            <div className="h-56 bg-surface-canvas rounded-2xl p-4 flex items-center justify-center overflow-hidden">
              <Image unoptimized className="h-full object-contain group-hover:scale-105 transition-transform" data-alt="HP OmniBook 3 AMD Ryzen AI laptop open with sharp modern wallpaper on display floating in crisp light" src="/images/homepage/2d1afe372d66.webp" alt="HP OmniBook 3 AMD Ryzen AI laptop open with sharp modern wallpaper on display floating in crisp light" width="512" height="279" loading="lazy" decoding="async" />
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="flex items-baseline gap-3 mb-4">
              <span className="font-price-hero text-price-hero font-extrabold text-primary">
                {"₹64,799"}
              </span>
              <span className="font-body-lg text-body-lg text-text-muted line-through">
                {"₹76,295"}
              </span>
              <span className="font-label-md text-label-md text-success-emerald font-bold">
                {"Save ₹11,496"}
              </span>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 py-3 rounded-xl bg-secondary-container hover:bg-crimson-deep text-on-secondary font-label-md text-label-md font-semibold text-center transition-colors shadow-md" type="button" data-action="enquire">
                {"Add to Cart"}
              </button>
              <a className="px-5 py-3 rounded-xl bg-surface-canvas hover:bg-surface-subtle font-label-md text-label-md font-semibold text-primary text-center transition-colors" data-path="product-details" href="#contact" data-action="details">
                {"Specs Matrix"}
              </a>
            </div>
          </div>
        </div>
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1 gap-4">
          <div className="bg-surface-canvas rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row items-center gap-5 justify-between" data-product={"HP 15s AMD Ryzen 5 Quad Core"} data-product-id="8">
            <div className="w-full lg:w-40 h-36 bg-surface-subtle rounded-xl p-3 flex items-center justify-center shrink-0">
              <Image unoptimized className="h-full object-contain" data-alt="HP 15s slim silver laptop displayed from isometric perspective" src="/images/homepage/7b0c8fe9a677.webp" alt="HP 15s slim silver laptop displayed from isometric perspective" width="512" height="279" loading="lazy" decoding="async" />
            </div>
            <div className="flex-1 space-y-1 w-full">
              <div className="flex items-center gap-2">
                <span className="text-badge-discount font-label-sm text-label-sm font-bold bg-crimson-tint px-2 py-0.5 rounded-full">
                  {"-15% OFF"}
                </span>
                <span className="text-text-muted font-label-sm text-label-sm">
                  {"AMD Ryzen 5 7520U"}
                </span>
              </div>
              <h4 className="font-title-md text-title-md font-bold text-primary">
                {"HP 15s AMD Ryzen 5 Quad Core"}
              </h4>
              <p className="font-body-sm text-body-sm text-text-secondary line-clamp-1">
                {"16GB LPDDR5, 512GB SSD, 15.6\" FHD Anti-Glare with Fast Charge (50% in 45 min)."}
              </p>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="font-price-card text-price-card font-bold text-primary">
                  {"₹47,499"}
                </span>
                <span className="font-body-sm text-body-sm text-text-muted line-through">
                  {"₹55,695"}
                </span>
              </div>
            </div>
            <button className="w-full lg:w-auto px-4 py-2.5 rounded-xl bg-primary hover:bg-navy-light text-on-primary font-label-sm text-label-sm font-semibold shrink-0 transition-colors" type="button" data-action="enquire">
              {"Add to Cart"}
            </button>
          </div>
          <div className="bg-surface-canvas rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row items-center gap-5 justify-between" data-product={"HP 14 Intel Core Ultra 5 AI"} data-product-id="9">
            <div className="w-full lg:w-40 h-36 bg-surface-subtle rounded-xl p-3 flex items-center justify-center shrink-0">
              <Image unoptimized className="h-full object-contain" data-alt="HP 14 Intel Core Ultra 5 AI powered laptop with slim bezels on screen" src="/images/homepage/92a9d1c3a8ba.webp" alt="HP 14 Intel Core Ultra 5 AI powered laptop with slim bezels on screen" width="512" height="279" loading="lazy" decoding="async" />
            </div>
            <div className="flex-1 space-y-1 w-full">
              <div className="flex items-center gap-2">
                <span className="text-badge-discount font-label-sm text-label-sm font-bold bg-crimson-tint px-2 py-0.5 rounded-full">
                  {"-13% OFF"}
                </span>
                <span className="text-text-muted font-label-sm text-label-sm">
                  {"Intel Ultra 5-125H AI"}
                </span>
              </div>
              <h4 className="font-title-md text-title-md font-bold text-primary">
                {"HP 14 Intel Core Ultra 5 AI"}
              </h4>
              <p className="font-body-sm text-body-sm text-text-secondary line-clamp-1">
                {"16GB DDR5, 512GB SSD, Intel Arc Graphics, 300-nit Bright FHD Display."}
              </p>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="font-price-card text-price-card font-bold text-primary">
                  {"₹70,399"}
                </span>
                <span className="font-body-sm text-body-sm text-text-muted line-through">
                  {"₹80,755"}
                </span>
              </div>
            </div>
            <button className="w-full lg:w-auto px-4 py-2.5 rounded-xl bg-primary hover:bg-navy-light text-on-primary font-label-sm text-label-sm font-semibold shrink-0 transition-colors" type="button" data-action="enquire">
              {"Add to Cart"}
            </button>
          </div>
          <div className="bg-surface-canvas rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row items-center gap-5 justify-between" data-product={"HP 15 AMD Ryzen 3 7320U"} data-product-id="10">
            <div className="w-full lg:w-40 h-36 bg-surface-subtle rounded-xl p-3 flex items-center justify-center shrink-0">
              <Image unoptimized className="h-full object-contain" data-alt="Budget friendly HP 15 AMD Ryzen 3 laptop with clean dark finish" src="/images/homepage/4fd0cb2682bb.webp" alt="Budget friendly HP 15 AMD Ryzen 3 laptop with clean dark finish" width="512" height="279" loading="lazy" decoding="async" />
            </div>
            <div className="flex-1 space-y-1 w-full">
              <div className="flex items-center gap-2">
                <span className="text-badge-discount font-label-sm text-label-sm font-bold bg-crimson-tint px-2 py-0.5 rounded-full">
                  {"-19% OFF"}
                </span>
                <span className="text-text-muted font-label-sm text-label-sm">
                  {"Budget Champion"}
                </span>
              </div>
              <h4 className="font-title-md text-title-md font-bold text-primary">
                {"HP 15 AMD Ryzen 3 7320U"}
              </h4>
              <p className="font-body-sm text-body-sm text-text-secondary line-clamp-1">
                {"8GB RAM, 512GB NVMe SSD, Wi-Fi 6, 1080p WebCam, Windows 11 + Office 2024."}
              </p>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="font-price-card text-price-card font-bold text-primary">
                  {"₹36,099"}
                </span>
                <span className="font-body-sm text-body-sm text-text-muted line-through">
                  {"₹44,783"}
                </span>
              </div>
            </div>
            <button className="w-full lg:w-auto px-4 py-2.5 rounded-xl bg-primary hover:bg-navy-light text-on-primary font-label-sm text-label-sm font-semibold shrink-0 transition-colors" type="button" data-action="enquire">
              {"Add to Cart"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
