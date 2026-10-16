import { z } from "zod";
export const storeLocationsSchema = z.array(z.object({ id: z.number(), name: z.string(), city: z.string(), address: z.string(), phone: z.string(), google_maps_url: z.string() }));
export type StoreLocation = z.infer<typeof storeLocationsSchema>[number];
