"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function HeroCarousel() {
  const [activeSlide, setActiveSlide] = useState(4);
  const [paused, setPaused] = useState(false);
  const goToSlide = (index: number) => setActiveSlide((index + 6) % 6);
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => setActiveSlide((slide) => (slide + 1) % 6), 7000);
    return () => window.clearInterval(interval);
  }, [paused, activeSlide]);
  return (
    <div onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}
         aria-roledescription="carousel" aria-label="SKY offers">
      <section className="relative w-full overflow-hidden bg-primary-container text-on-primary" id="hero">
        <div className="relative w-full aspect-[21/9] sm:aspect-[16/7] md:aspect-[16/6] min-h-[460px] max-h-[640px]" id="hero-carousel">
          <div className={"hero-slide absolute inset-0 transition-opacity duration-700 ease-in-out flex items-center  " + (activeSlide === 0 ? " opacity-100 z-10" : " opacity-0 z-0 hidden")} aria-hidden={activeSlide !== 0}>
            <div className="absolute inset-0 bg-gradient-to-r from-primary-container via-primary-container/85 to-transparent z-10">

            </div>
            <div className="absolute inset-0 bg-cover bg-center" data-alt="Futuristic electronic showroom with gleaming smartphones including Samsung Galaxy S24, slim metallic laptops, vibrant ambient blue and scarlet studio lighting, clean tech background" style={{"backgroundImage": "url('/images/homepage/0c71b868f877.webp')"}}>

            </div>
            <div className="relative z-20 max-w-7xl mx-auto px-6 lg:px-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary font-label-sm text-label-sm uppercase tracking-wider shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping">

                  </span>
                  {"Festive Mega Carnival 2026"}
                </div>
                <h2 className="font-display-xl text-display-xl font-extrabold text-on-primary tracking-tight leading-tight">
                  {"SKY MEGA TECH"}
                  <br className="hidden sm:inline" />
                  <span className="text-tertiary-fixed">
                    {"CARNIVAL"}
                  </span>
                </h2>
                <p className="font-body-lg text-body-lg text-tertiary-fixed-dim max-w-xl">
                  {"Up to 60% OFF on Flagships, 4K OLED TVs & Premium Gadgets. Instant â‚¹10,000 Exchange Bonus + Zero Down Payment EMI."}
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a className="px-6 py-3.5 rounded-xl bg-secondary-container hover:bg-crimson-deep text-on-secondary font-label-lg text-label-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2" data-path="deals-and-offers" href="#offers">
                    <span className="">
                      {"Shop Mega Deals"}
                    </span>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      {"arrow_forward"}
                    </span>
                  </a>
                  <a className="px-6 py-3.5 rounded-xl bg-surface-container-lowest/10 hover:bg-surface-container-lowest/20 backdrop-blur-md text-on-primary font-label-lg text-label-lg transition-all" data-path="mobiles-and-5g" href="#smartphones">
                    {"Explore Top Offers"}
                  </a>
                </div>
                <div className="flex items-center gap-6 pt-2 text-text-muted font-label-sm text-label-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-success-emerald text-[18px]" aria-hidden="true">
                      {"verified"}
                    </span>
                    {"100% Genuine Brands"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-success-emerald text-[18px]" aria-hidden="true">
                      {"bolt"}
                    </span>
                    {"Express 2-Hr Store Pickup"}
                  </span>
                </div>
              </div>
              <div className="hidden lg:flex lg:col-span-5 justify-end">
                <div className="relative w-80 h-80 rounded-3xl bg-surface-container-lowest/5 p-4 backdrop-blur-md shadow-2xl flex items-center justify-center">
                  <Image unoptimized className="w-full h-full object-contain" data-alt="High tech Samsung Galaxy S24 Ultra and foldable smartphones floating over an illuminated dark navy reflective surface" src="/images/homepage/0637b54ba743.webp" alt="High tech Samsung Galaxy S24 Ultra and foldable smartphones floating over an illuminated dark navy reflective surface" width="512" height="279" loading="lazy" decoding="async" />
                  <div className="absolute -bottom-4 -left-4 bg-surface-canvas text-on-surface p-3.5 rounded-2xl shadow-xl flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary text-[28px]" aria-hidden="true">
                      {"percent"}
                    </span>
                    <div>
                      <div className="font-price-card text-price-card text-primary leading-tight">
                        {"Up to 60% Off"}
                      </div>
                      <div className="font-label-sm text-label-sm text-text-muted">
                        {"On top mobile brands"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className={"hero-slide absolute inset-0 transition-opacity duration-700 ease-in-out flex items-center  " + (activeSlide === 1 ? " opacity-100 z-10" : " opacity-0 z-0 hidden")} aria-hidden={activeSlide !== 1}>
            <div className="absolute inset-0 bg-gradient-to-r from-navy-deep via-navy-deep/80 to-transparent z-10">

            </div>
            <div className="absolute inset-0 bg-cover bg-center" data-alt="High resolution studio photography of Galaxy Z Fold 6 open display and iPhone 16 Pro sleek matte titanium chassis in elegant dark studio ambience" style={{"backgroundImage": "url('/images/homepage/3838e79ba827.webp')"}}>

            </div>
            <div className="relative z-20 max-w-7xl mx-auto px-6 lg:px-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-highest/30 backdrop-blur text-tertiary-fixed font-label-sm text-label-sm uppercase tracking-wider">
                  <span className="">
                    {"Next-Gen Foldables & 5G Flagships"}
                  </span>
                </div>
                <h2 className="font-display-xl text-display-xl font-extrabold text-on-primary tracking-tight leading-tight">
                  {"GALAXY Z FOLD 6 &"}
                  <br />
                  <span className="text-secondary-fixed-dim">
                    {"IPHONE 16 PRO"}
                  </span>
                </h2>
                <p className="font-body-lg text-body-lg text-tertiary-fixed-dim max-w-xl">
                  {"Experience the evolution of mobile intelligence. Flat â‚¹10,000 Instant Bank Rebate + Free 6-Month Accidental Screen Damage Cover."}
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <a className="px-6 py-3.5 rounded-xl bg-secondary-container hover:bg-crimson-deep text-on-secondary font-label-lg text-label-lg shadow-lg transition-all flex items-center gap-2" data-path="mobiles-and-5g" href="#smartphones">
                    <span className="">
                      {"Explore Mobiles"}
                    </span>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      {"phone_iphone"}
                    </span>
                  </a>
                  <span className="font-label-md text-label-md text-tertiary-fixed">
                    {"Starting â‚¹19,849 with 5G"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className={"hero-slide absolute inset-0 transition-opacity duration-700 ease-in-out flex items-center  " + (activeSlide === 2 ? " opacity-100 z-10" : " opacity-0 z-0 hidden")} aria-hidden={activeSlide !== 2}>
            <div className="absolute inset-0 bg-gradient-to-r from-primary-container via-primary-container/85 to-transparent z-10">

            </div>
            <div className="absolute inset-0 bg-cover bg-center" data-alt="Modern ultra-slim HP OmniBook laptop with glowing OLED screen, wooden desk workspace with coffee cup and plant, warm natural morning light" style={{"backgroundImage": "url('/images/homepage/5829e8995391.webp')"}}>

            </div>
            <div className="relative z-20 max-w-7xl mx-auto px-6 lg:px-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success-emerald text-on-primary font-label-sm text-label-sm uppercase tracking-wider">
                  <span className="">
                    {"Copilot+ AI Laptops Live"}
                  </span>
                </div>
                <h2 className="font-display-xl text-display-xl font-extrabold text-on-primary tracking-tight leading-tight">
                  {"POWER YOUR"}
                  <br />
                  <span className="text-tertiary-fixed">
                    {"PRODUCTIVITY"}
                  </span>
                </h2>
                <p className="font-body-lg text-body-lg text-tertiary-fixed-dim max-w-xl">
                  {"HP OmniBook 3 AMD Ryzen AI 5 with pre-loaded Windows 11 & MS Office 2024. Save up to â‚¹15,000 with Instant Student Discount."}
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <a className="px-6 py-3.5 rounded-xl bg-secondary-container hover:bg-crimson-deep text-on-secondary font-label-lg text-label-lg shadow-lg transition-all" data-path="laptops-and-tablets" href="#laptops">
                    {"Shop Laptops & Tablets"}
                  </a>
                  <span className="font-label-md text-label-md text-tertiary-fixed">
                    {"0% Down Payment EMI"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className={"hero-slide absolute inset-0 transition-opacity duration-700 ease-in-out flex items-center  " + (activeSlide === 3 ? " opacity-100 z-10" : " opacity-0 z-0 hidden")} aria-hidden={activeSlide !== 3}>
            <div className="absolute inset-0 bg-gradient-to-r from-navy-deep via-navy-deep/85 to-transparent z-10">

            </div>
            <div className="absolute inset-0 bg-cover bg-center" data-alt="High quality studio shot of 3DOT portable wireless speakers with vibrant RGB lights, compact earbuds and GaN chargers arranged neatly on dark slate surface" style={{"backgroundImage": "url('/images/homepage/88e6beb007f6.webp')"}}>

            </div>
            <div className="relative z-20 max-w-7xl mx-auto px-6 lg:px-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary font-label-sm text-label-sm uppercase tracking-wider">
                  <span className="">
                    {"Exclusive Brand Lineup"}
                  </span>
                </div>
                <h2 className="font-display-xl text-display-xl font-extrabold text-on-primary tracking-tight leading-tight">
                  {"3DOT SIGNATURE"}
                  <br />
                  <span className="text-tertiary-fixed">
                    {"AUDIO & POWER"}
                  </span>
                </h2>
                <p className="font-body-lg text-body-lg text-tertiary-fixed-dim max-w-xl">
                  {"True Sound, True Quality â€” Mino 8W, Hubble 20W RGB & GaN Superfast Chargers starting at just â‚¹399. Engineered for endurance."}
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <a className="px-6 py-3.5 rounded-xl bg-secondary-container hover:bg-crimson-deep text-on-secondary font-label-lg text-label-lg shadow-lg transition-all" data-path="3dot-audio-gadgets" href="#gadgets">
                    {"Shop 3DOT Gadgets"}
                  </a>
                  <span className="font-label-md text-label-md text-tertiary-fixed">
                    {"Up to 78% Discount"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className={"hero-slide absolute inset-0 transition-opacity duration-700 ease-in-out flex items-center  " + (activeSlide === 4 ? " opacity-100 z-10" : " opacity-0 z-0 hidden")} aria-hidden={activeSlide !== 4}>
            <div className="absolute inset-0 bg-gradient-to-r from-primary-container via-primary-container/90 to-transparent z-10">

            </div>
            <div className="absolute inset-0 bg-cover bg-center" data-alt="Festive electronic sale banner showcasing festive lights, gold confetti, modern television set with vibrant 4K visuals and credit cards representing instant cashback" style={{"backgroundImage": "url('/images/homepage/5184979a5bd2.webp')"}}>

            </div>
            <div className="relative z-20 max-w-7xl mx-auto px-6 lg:px-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-badge-discount text-on-secondary font-label-sm text-label-sm uppercase tracking-wider">
                  <span className="">
                    {"Festival Specials"}
                  </span>
                </div>
                <h1 className="font-display-xl text-display-xl font-extrabold text-on-primary tracking-tight leading-tight">
                  {"SMARTPHONE EXCHANGE"}
                  <br />
                  <span className="text-secondary-fixed-dim">
                    {"BONUS â‚¹10,000"}
                  </span>
                </h1>
                <p className="font-body-lg text-body-lg text-tertiary-fixed-dim max-w-xl">
                  {"Trade in your old smartphone in any working condition. Instant valuation, spot cash credit and zero-cost paperless EMI."}
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <a className="px-6 py-3.5 rounded-xl bg-secondary-container hover:bg-crimson-deep text-on-secondary font-label-lg text-label-lg shadow-lg transition-all" data-path="deals-and-offers" href="#offers">
                    {"Calculate Exchange Value"}
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className={"hero-slide absolute inset-0 transition-opacity duration-700 ease-in-out flex items-center  " + (activeSlide === 5 ? " opacity-100 z-10" : " opacity-0 z-0 hidden")} aria-hidden={activeSlide !== 5}>
            <div className="absolute inset-0 bg-gradient-to-r from-navy-deep via-navy-deep/90 to-transparent z-10">

            </div>
            <div className="absolute inset-0 bg-cover bg-center" data-alt="Grand flagship electronics store interior with bright modern lighting, tech specialists assisting customers, and prominent SKY Mobile branding" style={{"backgroundImage": "url('/images/homepage/7838bf9ddbe6.webp')"}}>

            </div>
            <div className="relative z-20 max-w-7xl mx-auto px-6 lg:px-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-highest/20 text-tertiary-fixed font-label-sm text-label-sm uppercase tracking-wider">
                  <span className="">
                    {"Tamil Nadu's Trusted Pioneer â€¢ Estd. 2001"}
                  </span>
                </div>
                <h2 className="font-display-xl text-display-xl font-extrabold text-on-primary tracking-tight leading-tight">
                  {"25 YEARS OF TRUST"}
                  <br />
                  <span className="text-tertiary-fixed">
                    {"30+ STORES ACROSS TN"}
                  </span>
                </h2>
                <p className="font-body-lg text-body-lg text-tertiary-fixed-dim max-w-xl">
                  {"Founded by Mr. R. Yokesh Kumar. Vellore, Ranipet, Tirupattur, Kanchipuram & Pondicherry. Certified multi-brand mobile repair & sales."}
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <a className="px-6 py-3.5 rounded-xl bg-surface-canvas text-primary hover:bg-surface-subtle font-label-lg text-label-lg shadow-lg transition-all flex items-center gap-2" data-path="store-locator" href="#contact">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      {"location_on"}
                    </span>
                    <span className="">
                      {"Locate Nearest Store"}
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <button aria-label="Previous Slide" className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-surface-canvas/20 hover:bg-surface-canvas/40 backdrop-blur-md text-on-primary flex items-center justify-center transition-all" id="carousel-prev" type="button" onClick={() => goToSlide(activeSlide + (-1))}>
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
              {"chevron_left"}
            </span>
          </button>
          <button aria-label="Next Slide" className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-surface-canvas/20 hover:bg-surface-canvas/40 backdrop-blur-md text-on-primary flex items-center justify-center transition-all" id="carousel-next" type="button" onClick={() => goToSlide(activeSlide + (1))}>
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
              {"chevron_right"}
            </span>
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
            <button aria-label="Slide 1" data-slide="0" type="button" onClick={() => goToSlide(0)} aria-pressed={activeSlide === 0} className={"carousel-dot h-2 rounded-full transition-all " + (activeSlide === 0 ? "bg-secondary-container w-7" : "bg-surface-canvas/40 w-2")}>

            </button>
            <button aria-label="Slide 2" data-slide="1" type="button" onClick={() => goToSlide(1)} aria-pressed={activeSlide === 1} className={"carousel-dot h-2 rounded-full transition-all " + (activeSlide === 1 ? "bg-secondary-container w-7" : "bg-surface-canvas/40 w-2")}>

            </button>
            <button aria-label="Slide 3" data-slide="2" type="button" onClick={() => goToSlide(2)} aria-pressed={activeSlide === 2} className={"carousel-dot h-2 rounded-full transition-all " + (activeSlide === 2 ? "bg-secondary-container w-7" : "bg-surface-canvas/40 w-2")}>

            </button>
            <button aria-label="Slide 4" data-slide="3" type="button" onClick={() => goToSlide(3)} aria-pressed={activeSlide === 3} className={"carousel-dot h-2 rounded-full transition-all " + (activeSlide === 3 ? "bg-secondary-container w-7" : "bg-surface-canvas/40 w-2")}>

            </button>
            <button aria-label="Slide 5" data-slide="4" type="button" onClick={() => goToSlide(4)} aria-pressed={activeSlide === 4} className={"carousel-dot h-2 rounded-full transition-all " + (activeSlide === 4 ? "bg-secondary-container w-7" : "bg-surface-canvas/40 w-2")}>

            </button>
            <button aria-label="Slide 6" data-slide="5" type="button" onClick={() => goToSlide(5)} aria-pressed={activeSlide === 5} className={"carousel-dot h-2 rounded-full transition-all " + (activeSlide === 5 ? "bg-secondary-container w-7" : "bg-surface-canvas/40 w-2")}>

            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
