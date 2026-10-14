import Image from "next/image";

const products = [
  {
    title: "Samsung Galaxy S24 5G",
    image: "/images/homepage/6bc3e6380c44.webp",
    description:
      "Super AMOLED display, Snapdragon 8 Gen 3, Galaxy AI Live Translate & ProVisual Engine.",
    price: "₹64,999",
    original: "₹82,999",
    badge: "-22% OFF",
  },
  {
    title: "Samsung Galaxy Z Fold 6",
    image: "/images/homepage/41544b30a10c.webp",
    description: "Seamless Foldable Dynamic AMOLED 2X, Dual Screen Multitasking, S-Pen Ready.",
    price: "₹164,999",
    original: "₹200,999",
    badge: "-18% OFF",
  },
  {
    title: "Samsung Galaxy Z Flip 6",
    image: "/images/homepage/7567bff9fda0.webp",
    description: "Ultra-sleek pocket design, 50MP ProVisual camera, FlexCam Handsfree capture.",
    price: "₹109,999",
    original: "₹121,999",
    badge: "-10% OFF",
  },
  {
    title: "OnePlus 13 5G",
    image: "/images/homepage/260fd17eae47.webp",
    description: "Snapdragon 8 Elite chipset, 5th Gen Hasselblad Camera, 6000mAh Glacier Battery.",
    price: "₹66,499",
    original: "₹73,149",
    badge: "-9% OFF",
  },
  {
    title: "Nothing Phone (4b) 5G",
    image: "/images/homepage/cffe24792a4a.webp",
    description:
      "Iconic transparent back, Glyph Interface illumination, Nothing OS bloatware-free.",
    price: "₹37,999",
    original: "₹38,949",
    badge: "Explore",
  },
  {
    title: "Vivo V80 5G",
    image: "/images/homepage/a80dab15621d.webp",
    description:
      "Smart Aura Light Portrait System, ZEISS Cinematic Video & 1.5K 120Hz Curved AMOLED.",
    price: "₹59,849",
    original: "₹71,249",
    badge: "-16% OFF",
  },
  {
    title: "Oppo F35 Pro 5G",
    image: "/images/homepage/89616936cbc8.webp",
    description:
      "Ultra-slim featherweight design, IP69 all-weather water resistance, 80W SUPERVOOC.",
    price: "₹43,699",
    original: "₹52,249",
    badge: "-16% OFF",
  },
  {
    title: "Moto G37 Power 5G",
    image: "/images/homepage/d67c21554a65.webp",
    description: "Massive 6000mAh battery, Dolby Atmos stereo speakers, clean stock Android 14.",
    price: "₹19,849",
    original: "₹20,899",
    badge: "-5% OFF",
  },
];

export function SmartphoneCollection() {
  return (
    <section className="phone-showcase phone-redesign" id="smartphones">
      <div className="phone-container">
        <div className="phone-heading">
          <div>
            <span className="phone-eyebrow">THE SMARTPHONE EDIT</span>
            <h2>Discover The Latest Smartphones</h2>
            <p>
              A better camera. A faster day. A whole new experience.
              <br />
              Your next favourite phone is right here.
            </p>
            <a href="#phone-products" className="phone-hero-cta">
              Find your next phone <span aria-hidden="true">&#8599;</span>
            </a>
          </div>
          <div className="phone-hero-art">
            <span className="phone-hero-halo" aria-hidden="true" />
            <Image
              src="/images/homepage/categories-v2/smartphones.webp"
              alt="Premium smartphones with a titanium finish and blue display"
              width={640}
              height={640}
              unoptimized
              loading="lazy"
            />
            <span className="phone-hero-caption">Designed for your next chapter.</span>
          </div>
        </div>
        <div className="phone-assurance">
          <span>
            <span className="phone-assurance-mark" aria-hidden="true">
              &#10003;
            </span>
            Official brand warranty
          </span>
          <span>
            <span className="phone-assurance-mark" aria-hidden="true">
              &#10003;
            </span>
            In-store setup
          </span>
          <span>
            <span className="phone-assurance-mark" aria-hidden="true">
              &#10003;
            </span>
            Flexible EMI options
          </span>
        </div>
        <div className="phone-toolbar">
          <div id="mobile-tabs" className="phone-filters" aria-label="Smartphone filters">
            {["All Mobiles", "Flagship AI", "Fold & Flip", "Best Sellers"].map((filter, index) => (
              <button type="button" key={filter} aria-pressed={index === 0}>
                {filter}
              </button>
            ))}
          </div>
          <a href="#contact" className="phone-help">
            Find your perfect fit <span aria-hidden="true">&#8599;</span>
          </a>
        </div>
        <div className="phone-grid" id="phone-products">
          {products.map((product, index) => (
            <article
              className="phone-card"
              key={product.title}
              data-product={product.title}
              data-product-id={index}
            >
              <div className="phone-card-top">
                <span className="phone-offer">{product.badge}</span>
                <button
                  type="button"
                  className="phone-save"
                  data-action="wishlist-product"
                  aria-label="Add to Wishlist"
                  aria-pressed="false"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    favorite
                  </span>
                </button>
              </div>
              <a
                className="phone-image"
                href="#contact"
                data-action="details"
                aria-label={`View ${product.title}`}
              >
                <Image
                  src={product.image}
                  alt={product.title}
                  width={512}
                  height={279}
                  unoptimized
                  loading="lazy"
                />
              </a>
              <div className="phone-card-copy">
                <span className="phone-brand">
                  {product.title.split(" ")[0]} <span aria-hidden="true">&middot;</span> 5G
                  collection
                </span>
                <h3>{product.title}</h3>
                <p className="phone-description">{product.description}</p>
                <div className="phone-price">
                  <strong className="font-price-card">{product.price}</strong>
                  <del>{product.original}</del>
                </div>
                <span className="phone-warranty">
                  <span aria-hidden="true">&#10003;</span> Official warranty
                </span>
              </div>
              <div className="phone-card-actions">
                <a href="#contact" data-action="details">
                  Explore <span aria-hidden="true">&#8599;</span>
                </a>
                <button type="button" data-action="enquire">
                  Add to Cart
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
