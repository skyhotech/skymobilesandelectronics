"use client";

import { useState } from "react";
import { MediaImage } from "@/components/media/media-image";
import { uploadMedia } from "@/lib/media";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { allReferences, managementApi, type Reference } from "@/lib/management-api";
import { categorySchema } from "@/lib/categories";
import { isDescendant } from "@/lib/category-tree";
import styles from "./management.module.css";

const schema = z.object({
  parent: z.string(),
  name: z.string().trim().min(1, "Name is required").max(120),
  slug: z.string().trim().min(1).max(140).regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers and hyphens"),
  image_url: categorySchema.shape.image_url,
  badge: z.string().max(40), description: z.string().max(240),
  starting_price: z.string().regex(/^(|\d{1,10}(\.\d{1,2})?)$/, "Enter an amount with up to two decimals"),
  destination: categorySchema.shape.destination,
  display_order: z.number().int().min(0).max(2147483647),
  is_active: z.boolean(), show_on_homepage: z.boolean(),
}).refine((data) => !data.show_on_homepage || Boolean(data.image_url), { path: ["image_url"], message: "Choose an image before displaying on the homepage" });
type Fields = z.infer<typeof schema>;

export function CategoryForm({ entry, onSaved, onClose, parentId = null }: { parentId?: number | null; entry: Reference | "new"; onSaved: () => void; onClose: () => void }) {
  const category = entry === "new" ? null : categorySchema.parse(entry);
  const parents = useQuery({ queryKey: ["management", "references", "category-parents"], queryFn: () => allReferences("categories"), retry: false });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const form = useForm<Fields>({ resolver: zodResolver(schema), defaultValues: {
    parent: (category ? category.parent : parentId) ? String(category ? category.parent : parentId) : "",
    name: category?.name || "", slug: category?.slug || "", image_url: category?.image_url || "",
    badge: category?.badge || "", description: category?.description || "",
    starting_price: category?.starting_price || "", destination: category?.destination || "#smartphones",
    display_order: category?.display_order || 0, is_active: category?.is_active ?? true,
    show_on_homepage: category?.show_on_homepage ?? false,
  } });
  const save = useMutation({
    mutationFn: (values: Fields) => managementApi(`categories/${category ? `${category.id}/` : ""}`, category ? "PATCH" : "POST", { ...values, parent: values.parent ? Number(values.parent) : null, starting_price: values.starting_price || null }),
    onSuccess: onSaved,
  });
  const selectedImage = useWatch({ control: form.control, name: "image_url" });
  const selectedParent = useWatch({ control: form.control, name: "parent" });
  async function upload(file?: File) {
    if (!file) return;
    setUploadError("");
    if (file.size > 5 * 1024 * 1024) { setUploadError("Choose an image no larger than 5 MB."); return; }
    setUploading(true);
    try {
      form.setValue("image_url", categorySchema.shape.image_url.parse(await uploadMedia(file, "categories")), { shouldDirty: true, shouldValidate: true });
    } catch (error) { setUploadError(error instanceof Error ? error.message : "Image upload failed."); }
    finally { setUploading(false); }
  }
  return <form className={styles.form} onSubmit={form.handleSubmit((values) => save.mutate(values))}>
    <p className={styles.muted}>These details control the cards in “Explore Our Categories”. Saved changes appear on the next website or app refresh.</p>
    <label>Name<input {...form.register("name")} /></label>
    <label>Slug<input aria-label="Slug" {...form.register("slug")} /></label>
    <label>Parent category<select aria-label="Parent category" {...form.register("parent")} value={selectedParent} disabled={parents.isPending || Boolean(parents.error)}><option value="">None (main category)</option>{parents.data?.filter((item) => !category || !isDescendant(parents.data, item.id, category.id)).map((item) => <option key={item.id} value={item.id}>{item.name}{item.is_active ? "" : " (inactive)"}</option>)}</select></label>
    <small className={styles.muted}>Choose any category to nest under it, up to 12 levels. Leave empty for a main category.</small>
    {parents.error && <p role="alert" className={styles.error}>Unable to load parent categories. <button type="button" onClick={() => parents.refetch()}>Retry</button></p>}
    <div className={styles.categoryImagePreview}>{selectedImage ? <MediaImage src={selectedImage} alt="Category image preview" width={180} height={180} unoptimized /> : <span>Choose a category image</span>}</div>
    <label>Upload image<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label>
    <small className={styles.muted}>PNG, JPEG or WebP. Maximum 5 MB and 16 megapixels. Converted to optimized WebP.</small>
    {selectedImage && <button type="button" className={styles.secondary} disabled={uploading} onClick={() => form.setValue("image_url", "", { shouldDirty: true, shouldValidate: true })}>Remove image from category</button>}
    {uploading && <p role="status">Uploading image…</p>}{uploadError && <p role="alert" className={styles.error}>{uploadError}</p>}
    <div className={styles.formGrid}>
      <label>Badge<input placeholder="New 5G" {...form.register("badge")} /></label>
      <label>Starting price (INR)<input inputMode="decimal" placeholder="Optional" {...form.register("starting_price")} /></label>
    </div>
    <label>Card subtitle<input placeholder="AMOLED & Bluetooth calling" {...form.register("description")} /></label>
    <div className={styles.formGrid}>
      <label>Link to section<select aria-label="Link to section" {...form.register("destination")}><option value="#smartphones">Smartphones</option><option value="#laptops">Laptops & tablets</option><option value="#gadgets">Gadgets & audio</option><option value="#entertainment">TVs & appliances</option></select></label>
      <label>Display order<input type="number" min="0" {...form.register("display_order", { valueAsNumber: true })} /></label>
    </div>
    <small className={styles.muted}>Lower display order appears first. Starting price is merchandising copy; it does not change product prices.</small>
    <label className={styles.check}><input type="checkbox" {...form.register("show_on_homepage")} />Show on homepage</label>
    <label className={styles.check}><input type="checkbox" {...form.register("is_active")} />Active</label>
    {Object.keys(form.formState.errors).length > 0 && <div role="alert" className={styles.error}>{Object.entries(form.formState.errors).map(([key, value]) => <p key={key}>{key.replaceAll("_", " ")}: {value.message}</p>)}</div>}
    {save.error && <p role="alert" className={styles.error}>{save.error.message}</p>}
    <div className={styles.formActions}><button type="button" className={styles.secondary} onClick={onClose} disabled={save.isPending || uploading}>Cancel</button><button className={styles.primary} disabled={save.isPending || uploading}>{save.isPending ? "Saving…" : "Save category"}</button></div>
  </form>;
}
