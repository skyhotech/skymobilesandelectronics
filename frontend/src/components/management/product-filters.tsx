"use client";

import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { allReferences } from "@/lib/management-api";
import styles from "./filters.module.css";

const price = z.string().refine(value => value === "" || /^\d{1,10}(\.\d{1,2})?$/.test(value), "Enter a nonnegative price with up to two decimals.");
const schema = z.object({
  status: z.enum(["all", "active", "inactive"]), category: z.string(),
  min_price: price, max_price: price, ordering: z.enum(["name", "-name", "price", "-price", "-id"]),
}).refine(value => !value.min_price || !value.max_price || Number(value.min_price) <= Number(value.max_price), {
  path: ["max_price"], message: "Maximum must be at least minimum price.",
});
export type ProductFilterValues = z.infer<typeof schema>;
export const defaultProductFilters: ProductFilterValues = { status: "all", category: "", min_price: "", max_price: "", ordering: "name" };

export function ProductFilters({ value, onApply, onClear }: { value: ProductFilterValues; onApply: (value: ProductFilterValues) => void; onClear: () => void }) {
  const categories = useQuery({ queryKey: ["management", "references", "categories"], queryFn: () => allReferences("categories") });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductFilterValues>({ resolver: zodResolver(schema), defaultValues: value });
  return <form className={styles.productFilters} aria-label="Product filters" onSubmit={handleSubmit(onApply)}>
    <label>Product status<select {...register("status")}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
    <label>Product category<select {...register("category")} disabled={categories.isPending || !!categories.error}><option value="">All categories</option>{categories.data?.map(category => <option key={category.id} value={category.id}>{category.name} /{category.slug}</option>)}</select></label>
    <label>Minimum price (₹)<input type="number" min="0" max="9999999999.99" step="0.01" {...register("min_price")} /></label>
    <label>Maximum price (₹)<input type="number" min="0" max="9999999999.99" step="0.01" {...register("max_price")} /></label>
    <label>Sort products<select {...register("ordering")}><option value="name">Name A–Z</option><option value="-name">Name Z–A</option><option value="price">Price: low to high</option><option value="-price">Price: high to low</option><option value="-id">Newest first</option></select></label>
    <button type="submit">Apply filters</button><button type="button" onClick={() => { reset(defaultProductFilters); onClear(); }}>Clear filters</button>
    {Object.entries(errors).map(([key, error]) => <p role="alert" key={key}>{error.message}</p>)}
    {categories.error && <p role="alert">Unable to load category options. <button type="button" onClick={() => categories.refetch()}>Retry</button></p>}
  </form>;
}
