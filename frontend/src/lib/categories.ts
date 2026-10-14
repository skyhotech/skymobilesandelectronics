import { z } from "zod";
import { resolveMediaUrl } from "./media";

export const categorySchema = z.object({
  id: z.number().int(), name: z.string(), slug: z.string(), is_active: z.boolean(),
  parent: z.number().int().nullable().default(null),
  parent_name: z.string().default(""),
  image_url: z.string().refine((value) => !value || Boolean(resolveMediaUrl(value)), "Invalid media reference"),
  badge: z.string(), description: z.string(), starting_price: z.string().nullable(),
  destination: z.enum(["#smartphones", "#laptops", "#gadgets", "#entertainment"]),
  display_order: z.number().int().nonnegative(), show_on_homepage: z.boolean(),
});
export type HomepageCategory = z.infer<typeof categorySchema>;
export const categoryTreeSnapshotSchema = z.object({ revision: z.number().int(), nodes: z.array(categorySchema) });
export const categoryPageSchema = z.object({
  count: z.number(), next: z.string().nullable(), previous: z.string().nullable(),
  results: z.array(categorySchema),
});
