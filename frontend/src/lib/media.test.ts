import { describe, expect, it } from "vitest";
import { resolveMediaUrl } from "./media";

describe("portable media URL resolution", () => {
  it.each(["products", "brands", "categories", "banners"])(
    "resolves %s paths against a development API origin",
    (kind) => {
      expect(
        resolveMediaUrl(`${kind}/optimized/image.webp`, {
          apiBaseUrl: "http://localhost:8000/api/v1",
          mediaOrigin: "",
        }),
      ).toBe(`http://localhost:8000/media/${kind}/optimized/image.webp`);
    },
  );
  it("uses production configuration without changing stored filenames", () => {
    expect(
      resolveMediaUrl("/media/products/main.webp", {
        apiBaseUrl: "https://api.example.test/api/v1",
        mediaOrigin: "https://media.example.test",
      }),
    ).toBe("https://media.example.test/media/products/main.webp");
  });
  it("supports same-origin delivery and missing media", () => {
    expect(resolveMediaUrl("/media/brands/logo.webp", { apiBaseUrl: "", mediaOrigin: "" })).toBe(
      "/media/brands/logo.webp",
    );
    expect(resolveMediaUrl(null)).toBeNull();
  });
  it.each([
    "javascript:alert(1)",
    "//evil.test/image.webp",
    "E:\\media\\image.webp",
    "/media/products/../secret.webp",
    "/media/products/%2e%2e/secret.webp",
    "https://evil.test/media/products/image.webp",
  ])("rejects unsafe reference %s", (reference) => {
    expect(
      resolveMediaUrl(reference, {
        apiBaseUrl: "https://api.example.test/api/v1",
        mediaOrigin: "",
      }),
    ).toBeNull();
  });
});
