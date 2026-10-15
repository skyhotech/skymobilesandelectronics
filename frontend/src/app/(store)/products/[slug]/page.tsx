import Link from "next/link";
import { notFound } from "next/navigation";
import { MediaImage } from "@/components/media/media-image";
import { formatPrice } from "@/lib/products";
import { CatalogUnavailable, loadProduct } from "@/lib/products-server";
import styles from "../catalog.module.css";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const product = await loadProduct(slug);
    if (!product) return { title: "Product not found | SKY", robots: { index: false } };
    return {
      title: `${product.name} | SKY Mobile & Electronics`,
      description: (product.description || `${product.name} from ${product.brand.name} at SKY Mobile & Electronics.`).slice(0, 160),
    };
  } catch (error) {
    if (!(error instanceof CatalogUnavailable)) throw error;
    return { title: "Product unavailable | SKY", robots: { index: false } };
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let product;
  try { product = await loadProduct(slug); }
  catch (error) {
    if (!(error instanceof CatalogUnavailable)) throw error;
    return <main className={styles.shell}><Link href="/products">All products</Link><h1>Product unavailable</h1><p role="alert">We could not load this product. Please try again shortly.</p><Link href={`/products/${encodeURIComponent(slug)}`}>Try again</Link></main>;
  }
  if (!product) notFound();
  return <main className={styles.shell}>
    <nav className={styles.nav} aria-label="Breadcrumb"><Link href="/">SKY home</Link><Link href="/products">Products</Link><span>{product.name}</span></nav>
    <div className={styles.detail}><MediaImage src={product.image_url} alt={product.name} width={600} height={480} sizes="(max-width: 768px) 100vw, 50vw" priority />
      <section><p>{product.brand.name} · {product.category.name}</p><h1>{product.name}</h1><p className={styles.price}>{formatPrice(product.price)}</p>
        {product.compare_at_price && <p>Comparison price: <del>{formatPrice(product.compare_at_price)}</del></p>}
        <p className={styles.description}>{product.description || "Contact the store for detailed product information."}</p>
        <p className={styles.notice}>Online checkout is not available yet. Contact SKY to confirm availability before purchasing.</p>
        <Link href="/#contact">Contact the store</Link>
      </section></div>
  </main>;
}
