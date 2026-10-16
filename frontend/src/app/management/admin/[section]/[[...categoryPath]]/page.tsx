import { notFound, redirect } from "next/navigation";
import { ManagementDashboard } from "@/components/management/dashboard";

export default async function AdminSection({
  params,
  searchParams,
}: {
  searchParams: Promise<{ brand?: string | string[]; search?: string | string[] }>;
  params: Promise<{ section: string; categoryPath?: string[] }>;
}) {
  const { section, categoryPath = [] } = await params;
  if (section === "products" && categoryPath.length === 0) redirect("/management/admin/brands");
  if (!["products", "brands", "categories", "dashboard", "themes", "inventory", "customers"].includes(section)) notFound();
  if (
    categoryPath.length > 1 ||
    (categoryPath.length && (section !== "categories" || !/^[1-9]\d*$/.test(categoryPath[0])))
  )
    notFound();
  const parentId = categoryPath.length ? Number(categoryPath[0]) : null;
  if (parentId !== null && !Number.isSafeInteger(parentId)) notFound();
  const rawQuery = await searchParams;
  const query = { brand: typeof rawQuery.brand === "string" ? rawQuery.brand : "", search: typeof rawQuery.search === "string" ? rawQuery.search : "" };
  const brandId = section === "brands" && /^[1-9]\d*$/.test(query.brand || "") ? Number(query.brand) : null;
  if (brandId !== null && !Number.isSafeInteger(brandId)) notFound();
  return (
    <ManagementDashboard
      key={`${section}:${brandId}:${query.search || ""}`}
      section={section as "products" | "brands" | "categories" | "dashboard" | "themes" | "inventory" | "customers"}
      parentId={parentId}
      initialBrandId={brandId}
      initialSearch={(query.search || "").slice(0, 120)}
    />
  );
}
