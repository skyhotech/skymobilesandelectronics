import Image from "next/image";

// Adapted from the supplied Stitch homepage reference.
export function WhySky() {
  return (
    <section className="w-full bg-surface-subtle py-16" id="why-sky">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-secondary font-label-sm text-label-sm uppercase tracking-wider font-bold">
            {"Heritage & Commitment"}
          </span>
          <h2 className="font-headline-lg text-headline-lg font-bold text-primary mt-1">
            {"Why Choose SKY Mobile & Electronics?"}
          </h2>
          <p className="font-body-md text-body-md text-text-secondary mt-2">
            {"Founded by Mr. R. Yokesh Kumar in 2001, built on continuous trust, authentic customer service and community devotion."}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-surface-canvas p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="why-sky-photo">
              <Image src="/images/homepage/why-sky-v2/legacy.webp" alt="A welcoming electronics purchase consultation" width={600} height={400} unoptimized loading="lazy" />
            </div>
            <h3 className="font-title-md text-title-md font-bold text-primary mb-2">
              {"25+ Years Legacy"}
            </h3>
            <p className="font-body-sm text-body-sm text-text-secondary leading-relaxed">
              {"Since 2001, we’ve served over 2 million satisfied customers across Tamil Nadu with unflinching product authenticity."}
            </p>
          </div>
          <div className="bg-surface-canvas p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="why-sky-photo">
              <Image src="/images/homepage/why-sky-v2/showrooms.webp" alt="A modern electronics showroom with demonstration tables" width={600} height={400} unoptimized loading="lazy" />
            </div>
            <h3 className="font-title-md text-title-md font-bold text-primary mb-2">
              {"30+ Live Showrooms"}
            </h3>
            <p className="font-body-sm text-body-sm text-text-secondary leading-relaxed">
              {"Touch, test, and experience devices in person. Walk into branches in Vellore, Pallikonda, Ranipet, Tirupattur & Pondicherry."}
            </p>
          </div>
          <div className="bg-surface-canvas p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="why-sky-photo">
              <Image src="/images/homepage/why-sky-v2/service.webp" alt="A technician repairing a smartphone at a precision workbench" width={600} height={400} unoptimized loading="lazy" />
            </div>
            <h3 className="font-title-md text-title-md font-bold text-primary mb-2">
              {"#1 in Mobile Service"}
            </h3>
            <p className="font-body-sm text-body-sm text-text-secondary leading-relaxed">
              {"Our specialized lab repairs all major brands with original components, certified technicians and quick turn-arounds."}
            </p>
          </div>
          <div className="bg-surface-canvas p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="why-sky-photo">
              <Image src="/images/homepage/why-sky-v2/emi.webp" alt="Customers discussing a new smartphone purchase with an advisor" width={600} height={400} unoptimized loading="lazy" />
            </div>
            <h3 className="font-title-md text-title-md font-bold text-primary mb-2">
              {"Zero Down Payment EMI"}
            </h3>
            <p className="font-body-sm text-body-sm text-text-secondary leading-relaxed">
              {"Walk away with your dream tech using instant spot approvals from Bajaj Finserv, IDFC FIRST, HDB & ICICI Bank."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
