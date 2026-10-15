import { z } from "zod";
import { resolveMediaUrl } from "./media";

export const homepageBrandSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
  logo_url: z.string().refine(value => Boolean(resolveMediaUrl(value)), "Invalid media reference"),
  display_order: z.number().int().nonnegative(),
});
export const homepageBrandsSchema = z.array(homepageBrandSchema);
export type HomepageBrand = z.infer<typeof homepageBrandSchema>;
