import { z } from "zod";

export const configSchema = z.object({
  tokens: z.object({
    primary: z.string().regex(/^#[\da-f]{6}$/i),
    secondary: z.string(),
    background: z.string(),
    surface: z.string(),
    text: z.string(),
    accent: z.string(),
    border: z.string(),
  }),
  radius: z.number().min(0).max(32),
  font: z.enum(["Inter", "Arial", "Georgia"]),
  effect: z.enum([
    "none",
    "lights",
    "kolam",
    "flowers",
    "snow",
    "hearts",
    "tricolor",
    "rain",
    "sun",
    "mist",
  ]),
  intensity: z.number().min(0).max(32),
  speed: z.number().min(4).max(40),
  transition_ms: z.number().min(0).max(1000),
  asset_ids: z.array(z.number()),
  weather: z.boolean(),
});
export const themeSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  category: z.string(),
  config: configSchema,
  is_default: z.boolean(),
  archived: z.boolean(),
  updated_at: z.string(),
});
export type Theme = z.infer<typeof themeSchema>;
export type Config = z.infer<typeof configSchema>;
export const assetSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: z.string(),
  url: z.string(),
  thumbnail: z.string(),
  width: z.number(),
  height: z.number(),
  bytes: z.number(),
  type: z.enum(["image", "video"]),
  duration: z.number(),
  poster: z.string(),
});
export type Asset = z.infer<typeof assetSchema> & { themes?: number[]; slides?: number[] };
export const slideSchema = z.object({
  id: z.number(),
  season_name: z.string(),
  offer_name: z.string(),
  finance_offer: z.string(),
  cta_label: z.string(),
  cta_url: z.string(),
  cta_enabled: z.boolean(),
  duration: z.number(),
  end_at: z.string().nullable(),
  media: assetSchema,
});
export const carouselSchema = z.object({
  id: z.number(),
  name: z.string(),
  placement: z.string(),
  transition: z.string(),
  slides: z.array(slideSchema),
});
export type PublicCarousel = z.infer<typeof carouselSchema>;
export const optionsSchema = z.object({
  animations: z.boolean(),
  weather: z.boolean(),
  festival_effects: z.boolean(),
  banner_effects: z.boolean(),
  day_night: z.boolean(),
  profile: z.enum(["high", "balanced", "battery", "off"]),
  timezone: z.string(),
  city: z.string(),
  hot_threshold: z.number(),
  apparent_temperature: z.boolean(),
  announcement: z.string(),
  announcement_start: z.string().nullable(),
  announcement_end: z.string().nullable(),
});
export type Options = z.infer<typeof optionsSchema>;
export const experienceSchema = z.object({
  revision: z.number(),
  version: z.string(),
  mode: z.enum(["manual", "automatic"]),
  theme: themeSchema,
  options: optionsSchema,
  assets: z.array(assetSchema),
  carousels: z.array(carouselSchema),
});
export type Experience = z.infer<typeof experienceSchema>;
export const defaultConfig: Config = {
  tokens: {
    primary: "#0b1c48",
    secondary: "#bb0014",
    background: "#faf8ff",
    surface: "#ffffff",
    text: "#131b2e",
    accent: "#dce1ff",
    border: "#c6c6d0",
  },
  radius: 16,
  font: "Inter",
  effect: "none",
  intensity: 12,
  speed: 12,
  transition_ms: 450,
  asset_ids: [],
  weather: true,
};
export const fallback: Experience = {
  revision: 0,
  version: "fallback",
  mode: "manual",
  theme: {
    id: 0,
    name: "Default SKY",
    slug: "default",
    description: "Original SKY storefront",
    category: "system",
    config: defaultConfig,
    is_default: true,
    archived: false,
    updated_at: "",
  },
  options: {
    animations: true,
    weather: false,
    festival_effects: true,
    banner_effects: true,
    day_night: true,
    profile: "balanced",
    timezone: "Asia/Kolkata",
    city: "Vellore",
    hot_threshold: 35,
    apparent_temperature: true,
    announcement: "",
    announcement_start: null,
    announcement_end: null,
  },
  assets: [],
  carousels: [],
};

export function tokenStyle(theme: Theme): Record<string, string> {
  if (theme.is_default) return {};
  const t = theme.config.tokens;
  return {
    "--color-primary": t.primary,
    "--color-primary-container": t.primary,
    "--color-navy-deep": t.primary,
    "--color-secondary": t.secondary,
    "--color-secondary-container": t.secondary,
    "--color-surface": t.background,
    "--color-background": t.background,
    "--color-surface-canvas": t.surface,
    "--color-surface-container-lowest": t.surface,
    "--color-on-surface": t.text,
    "--color-on-background": t.text,
    "--color-text-primary": t.text,
    "--color-border-card": t.border,
    "--sky-primary": t.primary,
    "--sky-secondary": t.secondary,
    "--sky-background": t.background,
    "--sky-surface": t.surface,
    "--sky-text": t.text,
    "--sky-accent": t.accent,
    "--sky-border": t.border,
    "--sky-radius": `${theme.config.radius}px`,
    "--sky-font": theme.config.font,
    "--sky-transition": `${theme.config.transition_ms}ms`,
  };
}
