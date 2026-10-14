import Image from "next/image";

// Adapted from the supplied Stitch homepage reference.
export function ServiceAssurance() {
  return (
    <section
      className="w-full bg-surface-canvas shadow-[0_2px_12px_rgba(11,28,72,0.04)] relative z-20"
      id="services"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-surface-subtle transition-all hover:bg-navy-tint">
            <div className="service-benefit-icon shrink-0">
              <Image
                src="/images/homepage/service-icons/genuine.webp"
                alt=""
                width={64}
                height={64}
                unoptimized
              />
            </div>
            <div>
              <h4 className="font-title-md text-title-md font-bold text-primary">
                {"100% Genuine Tech"}
              </h4>
              <p className="font-body-sm text-body-sm text-text-secondary leading-snug">
                {"Official Brand Warranty & GST Invoices"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-surface-subtle transition-all hover:bg-navy-tint">
            <div className="service-benefit-icon shrink-0">
              <Image
                src="/images/homepage/service-icons/stores.webp"
                alt=""
                width={64}
                height={64}
                unoptimized
              />
            </div>
            <div>
              <h4 className="font-title-md text-title-md font-bold text-primary">
                {"30+ Live Stores"}
              </h4>
              <p className="font-body-sm text-body-sm text-text-secondary leading-snug">
                {"Demo & Instant Handover in TN & Pondy"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-surface-subtle transition-all hover:bg-navy-tint">
            <div className="service-benefit-icon shrink-0">
              <Image
                src="/images/homepage/service-icons/emi.webp"
                alt=""
                width={64}
                height={64}
                unoptimized
              />
            </div>
            <div>
              <h4 className="font-title-md text-title-md font-bold text-primary">
                {"Easy No-Cost EMI"}
              </h4>
              <p className="font-body-sm text-body-sm text-text-secondary leading-snug">
                {"Bajaj, IDFC, HDB & ICICI Instant Approval"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-surface-subtle transition-all hover:bg-navy-tint">
            <div className="service-benefit-icon shrink-0">
              <Image
                src="/images/homepage/service-icons/service.webp"
                alt=""
                width={64}
                height={64}
                unoptimized
              />
            </div>
            <div>
              <h4 className="font-title-md text-title-md font-bold text-primary">
                {"#1 Mobile Service"}
              </h4>
              <p className="font-body-sm text-body-sm text-text-secondary leading-snug">
                {"Pioneers since 2001 • Certified Engineers"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
