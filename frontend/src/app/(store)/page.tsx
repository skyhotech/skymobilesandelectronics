export const dynamic = "force-dynamic";

import { BrandCollection } from "@/components/home/brand-collection";
import { CategoryCollection } from "@/components/home/category-collection";
import { CommunityCollection } from "@/components/home/community-collection";
import { FeaturedOffers } from "@/components/home/featured-offers";
import { FinancePartners } from "@/components/home/finance-partners";
import { GadgetCollection } from "@/components/home/gadget-collection";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { ExperienceCarousels } from "@/components/experience/carousel";
import { HomeEntertainment } from "@/components/home/home-entertainment";
import { HomepageInteractions } from "@/components/home/homepage-interactions";
import { LaptopCollection } from "@/components/home/laptop-collection";
import { ServiceAssurance } from "@/components/home/service-assurance";
import { SmartphoneCollection } from "@/components/home/smartphone-collection";
import { StoreLocator } from "@/components/home/store-locator";
import { loadStoreLocations } from "@/lib/store-locations-server";
import { StoreFooter } from "@/components/home/store-footer";
import { StoreHeader } from "@/components/home/store-header";
import { WhatsAppLink } from "@/components/home/whatsapp-link";
import { WhySky } from "@/components/home/why-sky";
import { GadgetBanner } from "@/components/home/gadget-banner";
import { loadHomepageCategories } from "@/lib/categories-server";
import { loadHomepageBrands } from "@/lib/brands-server";

export default async function HomePage() {
  const [categoryData, brands, storeLocations] = await Promise.all([
    loadHomepageCategories(),
    loadHomepageBrands(),
    loadStoreLocations(),
  ]);
  return (
    <HomepageInteractions>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <StoreHeader categories={categoryData.categories} />
      <main id="main-content" className="sky-main w-full pt-40 bg-surface min-h-screen">
        <div className="flex flex-col w-full">
          <GadgetBanner />
          <ExperienceCarousels placement="hero" fallback={<HeroCarousel />} />
          <ServiceAssurance />
          <CategoryCollection
            initialCategories={categoryData.categories}
            unavailable={categoryData.unavailable}
          />
          <BrandCollection brands={brands} />
          <SmartphoneCollection />
          <FeaturedOffers />
          <ExperienceCarousels placement="offers" />
          <LaptopCollection />
          <GadgetCollection />
          <HomeEntertainment />
          <WhySky />
          <CommunityCollection />
          <FinancePartners />
          <StoreLocator initialLocations={storeLocations} />
        </div>
      </main>
      <WhatsAppLink />
      <StoreFooter />
      <ExperienceCarousels placement="footer" />
    </HomepageInteractions>
  );
}
