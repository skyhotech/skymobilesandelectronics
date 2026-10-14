"use client";
import { MediaImage } from "@/components/media/media-image";
import type { HomepageCategory } from "@/lib/categories";
import { useLiveCategories } from "@/lib/live-categories";
import { CategoryBrowseTree } from "./category-browse-tree";

export function CategoryCollection({
  initialCategories,
  unavailable = false,
}: {
  initialCategories: HomepageCategory[];
  unavailable?: boolean;
}) {
  const { categories, error, synchronized } = useLiveCategories(initialCategories);
  return (
    <section className="category-showcase" id="categories">
      <div className="category-container">
        <div className="category-heading">
          <div>
            <span className="category-eyebrow">Everything Tech</span>
            <h2>Explore Our Categories</h2>
            <p>
              Mobiles, laptops, entertainment, wearables, charging and smart appliances — all in one
              place.
            </p>
          </div>
          <a className="category-view-all" href="#category-grid">
            View All Categories <span aria-hidden="true">↗</span>
          </a>
        </div>
        {(error || (unavailable && !synchronized)) && (
          <p role="status">Category updates are temporarily unavailable. Retrying automatically.</p>
        )}
        {(!unavailable || synchronized) && !categories.length && (
          <p>New categories are coming soon.</p>
        )}
        <CategoryBrowseTree categories={categories} />
        <div className="category-grid" id="category-grid">
          {categories.map((category) => (
            <a
              className="category-tile"
              id={`category-${category.id}`}
              href={category.destination}
              key={category.id}
            >
              {category.badge && <span className="category-tag">{category.badge}</span>}
              <div className="category-product-preview">
                <MediaImage
                  src={category.image_url}
                  alt={category.name}
                  width={640}
                  height={640}
                  unoptimized
                  loading="lazy"
                />
              </div>
              <div className="category-tile-copy">
                {category.parent_name && (
                  <p title={category.breadcrumb}>In {category.parent_name}</p>
                )}
                <h3>{category.name}</h3>
                {category.starting_price ? (
                  <p>
                    From{" "}
                    <strong>
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 2,
                      }).format(Number(category.starting_price))}
                    </strong>
                  </p>
                ) : (
                  <p>Explore the range</p>
                )}
                <div className="category-tile-bottom">
                  <span>{category.description}</span>
                  <span className="category-arrow" aria-hidden="true">
                    ↗
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
