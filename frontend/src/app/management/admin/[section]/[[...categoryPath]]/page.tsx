import { notFound, redirect } from "next/navigation";
import { ManagementDashboard } from "@/components/management/dashboard";

export default async function AdminSection({
  params,
}: {
  params: Promise<{ section: string; categoryPath?: string[] }>;
}) {
  const { section, categoryPath = [] } = await params;
  if (section === "products" && categoryPath.length === 0) redirect("/management/admin/brands");
  if (!["products", "brands", "categories", "dashboard"].includes(section)) notFound();
  if (
    categoryPath.length > 1 ||
    (categoryPath.length && (section !== "categories" || !/^[1-9]\d*$/.test(categoryPath[0])))
  )
    notFound();
  const parentId = categoryPath.length ? Number(categoryPath[0]) : null;
  if (parentId !== null && !Number.isSafeInteger(parentId)) notFound();
  return (
    <ManagementDashboard
      key={section}
      section={section as "products" | "brands" | "categories" | "dashboard"}
      parentId={parentId}
    />
  );
}
