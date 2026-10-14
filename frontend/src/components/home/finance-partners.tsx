import { FinancePartnerCarousel } from "./finance-partner-carousel";
export function FinancePartners() {
  return (
    <section className="w-full bg-surface-canvas py-12 border-t border-slate-100" id="finance">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center">
        <h3 className="font-title-md text-title-md font-bold text-primary mb-2">Our Official Finance &amp; Payment Partners</h3>
        <p className="font-body-sm text-body-sm text-text-secondary max-w-xl mx-auto mb-8">Take home today, pay in easy flexible instalments. Zero down payment and instant paperless approvals.</p>
        <FinancePartnerCarousel />
      </div>
    </section>
  );
}
