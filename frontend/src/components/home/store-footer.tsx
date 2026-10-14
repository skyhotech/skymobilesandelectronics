import Image from "next/image";

// Adapted from the supplied Stitch homepage reference.
export function StoreFooter() {
  return (
    <footer className="sky-glass-footer w-full" id="contact">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 pb-12">
        <div className="footer-columns grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="footer-brand-logo rounded-full overflow-hidden">
                <Image
                  unoptimized
                  alt="SKY Mobile Logo"
                  className="w-full h-full object-cover"
                  src="/images/homepage/545193f58191.webp"
                  width="450"
                  height="450"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div>
                <h3 className="font-title-md text-title-md font-bold text-primary">
                  {"SKY Mobile & Electronics"}
                </h3>
                <p className="font-label-sm text-label-sm text-text-muted">
                  {"Since 2001 • 25+ Years of Trust"}
                </p>
              </div>
            </div>
            <p className="font-body-sm text-body-sm text-text-secondary leading-relaxed">
              {
                "Founded by Mr. R. Yokesh Kumar, SKY Mobile has grown from a visionary retail shop into a premier omni-channel electronics powerhouse with 30+ branches spanning Tamil Nadu and Pondicherry."
              }
            </p>
            <div className="space-y-2 pt-2 text-text-secondary font-body-sm text-body-sm">
              <div className="flex items-start gap-2">
                <span
                  className="material-symbols-outlined text-[18px] text-primary shrink-0"
                  aria-hidden="true"
                >
                  {"location_on"}
                </span>
                <span className="">{"38, Veera Koil Street, Velapadi, Vellore - 632001"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-[18px] text-primary shrink-0"
                  aria-hidden="true"
                >
                  {"call"}
                </span>
                <span className="">{"+91 9842320212"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-[18px] text-primary shrink-0"
                  aria-hidden="true"
                >
                  {"mail"}
                </span>
                <span className="">{"support@skymobile.in"}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <a
                className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-colors shadow-sm"
                href="#contact"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  {"photo_camera"}
                </span>
              </a>
              <a
                className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-colors shadow-sm"
                href="#contact"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  {"public"}
                </span>
              </a>
              <a
                className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-colors shadow-sm"
                href="#contact"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  {"smart_display"}
                </span>
              </a>
              <a
                className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-colors shadow-sm"
                href="#contact"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  {"tag"}
                </span>
              </a>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-title-md text-title-md font-bold text-primary">
              {"Popular Categories"}
            </h4>
            <ul className="space-y-2.5 font-body-md text-body-md text-text-secondary">
              <li className="">
                <a
                  className="hover:text-primary transition-colors"
                  data-path="mobiles-and-5g"
                  href="#smartphones"
                >
                  {"Smartphones & 5G"}
                </a>
              </li>
              <li className="">
                <a
                  className="hover:text-primary transition-colors"
                  data-path="laptops-and-tablets"
                  href="#laptops"
                >
                  {"Laptops & MacBooks"}
                </a>
              </li>
              <li className="">
                <a
                  className="hover:text-primary transition-colors"
                  data-path="3dot-audio-gadgets"
                  href="#gadgets"
                >
                  {"3DOT Audio & True Wireless"}
                </a>
              </li>
              <li className="">
                <a
                  className="hover:text-primary transition-colors"
                  data-path="tvs-and-soundbars"
                  href="#entertainment"
                >
                  {"Smart TVs & Soundbars"}
                </a>
              </li>
              <li className="">
                <a
                  className="hover:text-primary transition-colors"
                  data-path="appliances"
                  href="#entertainment"
                >
                  {"Home & Kitchen Appliances"}
                </a>
              </li>
              <li className="">
                <a
                  className="hover:text-primary transition-colors"
                  data-path="wearables"
                  href="#gadgets"
                >
                  {"Smartwatches & Fitness Bands"}
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-title-md text-title-md font-bold text-primary">
              {"Customer Care"}
            </h4>
            <ul className="space-y-2.5 font-body-md text-body-md text-text-secondary">
              <li className="">
                <a
                  className="hover:text-primary transition-colors"
                  data-path="track-order"
                  href="#contact"
                  data-action="track-order"
                >
                  {"Track Your Order"}
                </a>
              </li>
              <li className="">
                <a
                  className="hover:text-primary transition-colors"
                  data-path="shipping-policy"
                  href="#contact"
                >
                  {"Shipping & Delivery Policy"}
                </a>
              </li>
              <li className="">
                <a
                  className="hover:text-primary transition-colors"
                  data-path="replacement-policy"
                  href="#contact"
                >
                  {"7-Day Replacement Policy"}
                </a>
              </li>
              <li className="">
                <a
                  className="hover:text-primary transition-colors"
                  data-path="warranty-support"
                  href="#contact"
                >
                  {"Official Warranty Support"}
                </a>
              </li>
              <li className="">
                <a
                  className="hover:text-primary transition-colors"
                  data-path="store-locator"
                  href="#contact"
                >
                  {"Store Locator (30+ Branches)"}
                </a>
              </li>
              <li className="">
                <a
                  className="hover:text-primary transition-colors"
                  data-path="emi-finance"
                  href="#finance"
                >
                  {"No-Cost EMI & Finance Options"}
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="font-title-md text-title-md font-bold text-primary">
                {"Finance Partners"}
              </h4>
              <p className="font-body-sm text-body-sm text-text-secondary">
                {"Instant paperless approval & Zero Cost EMI options."}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-surface p-2.5 rounded-lg shadow-sm text-center font-label-sm text-label-sm font-semibold text-primary">
                  {"Bajaj Finserv"}
                </div>
                <div className="bg-surface p-2.5 rounded-lg shadow-sm text-center font-label-sm text-label-sm font-semibold text-primary">
                  {"IDFC FIRST Bank"}
                </div>
                <div className="bg-surface p-2.5 rounded-lg shadow-sm text-center font-label-sm text-label-sm font-semibold text-primary">
                  {"HDB Financial"}
                </div>
                <div className="bg-surface p-2.5 rounded-lg shadow-sm text-center font-label-sm text-label-sm font-semibold text-primary">
                  {"ICICI Bank EMI"}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h5 className="font-label-md text-label-md font-semibold text-primary">
                {"100% Secure Payment Gateways"}
              </h5>
              <div className="flex items-center gap-2 flex-wrap text-text-muted font-label-sm text-label-sm">
                <span className="bg-surface px-2 py-1 rounded shadow-sm text-on-surface font-semibold">
                  {"UPI"}
                </span>
                <span className="bg-surface px-2 py-1 rounded shadow-sm text-on-surface font-semibold">
                  {"RuPay"}
                </span>
                <span className="bg-surface px-2 py-1 rounded shadow-sm text-on-surface font-semibold">
                  {"Visa"}
                </span>
                <span className="bg-surface px-2 py-1 rounded shadow-sm text-on-surface font-semibold">
                  {"Mastercard"}
                </span>
                <span className="bg-surface px-2 py-1 rounded shadow-sm text-on-surface font-semibold">
                  {"NetBanking"}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-6 bg-surface-container flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 rounded-xl font-body-sm text-body-sm text-text-secondary">
          <p className="">
            {
              "© 2026 skymobile.in. All Rights Reserved. Built with trust for Tamil Nadu & Pondicherry."
            }
          </p>
          <div className="flex items-center gap-6">
            <a
              className="hover:text-primary transition-colors"
              data-path="privacy-policy"
              href="#contact"
            >
              {"Privacy Policy"}
            </a>
            <a
              className="hover:text-primary transition-colors"
              data-path="terms-conditions"
              href="#contact"
            >
              {"Terms & Conditions"}
            </a>
            <a
              className="hover:text-primary transition-colors"
              data-path="replacement-policy"
              href="#contact"
            >
              {"Replacement Policy"}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
