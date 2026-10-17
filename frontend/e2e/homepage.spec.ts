import { test, expect } from "@playwright/test";

test("reference homepage loads local assets and all design sections", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Explore Our Categories" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Discover The Latest Smartphones" })).toBeVisible();
  await expect(page.locator(".hero-slide").filter({ visible: true })).toContainText("SMARTPHONE EXCHANGE");
  await page.locator("#hero").hover();
  await page.evaluate(async () => {
    const images = [...document.images];
    await Promise.all(images.map(async (image) => {
      image.loading = "eager";
      await image.decode();
    }));
    await document.fonts.ready;
  });
  const imageSources = await page.locator("img").evaluateAll((images) => images.map((image) => image.getAttribute("src")));
  expect(imageSources.every((source) => source?.startsWith("/images/homepage/"))).toBeTruthy();
  expect(errors).toEqual([]);
  await page.screenshot({ path: "../docs/design-reference/homepage/implemented-desktop.png", fullPage: true });
  await page.screenshot({ path: "../docs/design-reference/homepage/implemented-desktop-viewport.png" });
});

test("carousel controls and product filters work", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Next Slide", exact: true }).click();
  await expect(page.locator(".hero-slide").filter({ visible: true })).toContainText("25 YEARS OF TRUST");
  await page.getByRole("button", { name: "Slide 1", exact: true }).click();
  await expect(page.locator(".hero-slide").filter({ visible: true })).toContainText("SKY MEGA TECH");
  await page.getByRole("button", { name: "Fold & Flip", exact: true }).click();
  await expect(page.locator("#smartphones [data-product]:visible")).toHaveCount(2);
  await page.getByRole("button", { name: "All Mobiles", exact: true }).click();
  await expect(page.locator("#smartphones [data-product]:visible")).toHaveCount(8);
});

test("saving persists locally and enquiry shows the selected product", async ({ page }) => {
  await page.goto("/");
  const card = page.locator('#smartphones [data-product-id="0"]');
  await card.getByRole("button", { name: "Add to Wishlist", exact: true }).click();
  await expect(card.getByRole("button", { name: "Remove from Wishlist", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(card.getByRole("button", { name: "Remove from Wishlist", exact: true })).toHaveAttribute("aria-pressed", "true");
  await card.getByRole("button", { name: "Add to Cart", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading")).toHaveText("Samsung Galaxy S24 5G");
  await expect(dialog).toContainText("Online checkout is not available yet");
  await expect(dialog.getByRole("link", { name: "Enquire on WhatsApp" })).toHaveAttribute("href", /Samsung%20Galaxy%20S24%205G/);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("mobile layout fits and keyboard search finds products", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "networkidle" });
  const width = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  expect(width.document).toBeLessThanOrEqual(width.viewport);
  const columns = await page.locator("#services .grid").evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(" "));
  expect(columns).toHaveLength(2);
  await page.getByRole("searchbox", { name: "Search products" }).fill("Fold");
  await page.getByRole("searchbox", { name: "Search products" }).press("Enter");
  await expect(page.locator("#smartphones [data-product]:visible")).toHaveCount(1);
  await expect(page.getByRole("status")).toContainText("matching products");
  await page.getByRole("searchbox", { name: "Search products" }).fill("");
  await page.getByRole("searchbox", { name: "Search products" }).press("Enter");
  await page.locator("#hero").scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    await Promise.all([...document.images].map(async (image) => { if (image instanceof HTMLImageElement) { image.loading = "eager"; await image.decode(); } }));
    await document.fonts.ready;
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.screenshot({ path: "../docs/design-reference/homepage/implemented-mobile-viewport.png" });
  await page.screenshot({ path: "../docs/design-reference/homepage/implemented-mobile.png", fullPage: true });
});

test("finance partner trains stay aligned, pause and respect reduced motion", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const section = page.locator("#finance");
  const cards = section.locator('.finance-group:not([aria-hidden]) .finance-logo-card');
  await expect(cards).toHaveCount(15);
  await expect(section.locator('.finance-row')).toHaveCount(2);
  const sources = await cards.locator("img").evaluateAll(images => images.map(image => image.getAttribute("src")));
  expect(new Set(sources).size).toBe(15);
  await section.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const track = section.locator('.finance-track').first();
  const position = () => track.evaluate(node => getComputedStyle(node).transform);
  const before = await position();
  await expect.poll(position).not.toBe(before);
  await section.locator('.finance-viewport').hover();
  const hoveredPosition = await position();
  await expect.poll(position).not.toBe(hoveredPosition);
  await page.mouse.move(0, 0);
  await expect.poll(position).not.toBe(hoveredPosition);
  await section.screenshot({path:'../docs/design-reference/homepage/finance-trains-desktop.png'});
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await section.screenshot({path:'../docs/design-reference/homepage/finance-trains-mobile.png'});
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(section.getByRole("button")).toHaveCount(0);
  await expect.poll(position).toBe('none');
  await cards.locator("img").evaluateAll(async images => {
    await Promise.all(images.map(async image => { if (image instanceof HTMLImageElement) { image.loading = "eager"; await image.decode(); } }));
  });
});

test("coded gadget banner fills desktop width and loops without video", async ({ page }) => {
  const mediaRequests: string[] = [];
  page.on('request', request => { if (/\.mp4(?:$|\?)/.test(request.url())) mediaRequests.push(request.url()); });
  await page.goto('/', {waitUntil:'networkidle'});
  const banner = page.locator('#gadget-banner');
  await expect(banner).toBeVisible();
  const products = await banner.locator('.gadget-train-group[data-copy="0"] [data-gadget]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-gadget')));
  expect(products.length).toBe(36);
  expect(new Set(products).size).toBe(products.length);
  for (const required of ['televisions','air-conditioner','fridge','washing-machine','desktop-pc','laptops','earbuds','3dot-basspop','3dot-arion']) expect(products).toContain(required);

  await expect(page.locator('video')).toHaveCount(0);
  expect(mediaRequests).toEqual([]);
  await banner.locator('img').evaluateAll(async images => { await Promise.all(images.map(async image => { if(image instanceof HTMLImageElement) await image.decode(); })); });
  const size = await banner.boundingBox();
  expect(size!.width).toBe(page.viewportSize()!.width);
  expect(size!.height).toBeCloseTo(page.viewportSize()!.height * 0.65, 0);
  const pattern = banner.locator('.gadget-train').first();
  const position = () => pattern.evaluate(node => getComputedStyle(node).transform);
  const before = await position();
  await expect.poll(position).not.toBe(before);
  await banner.hover();
  const hovered = await position();
  await expect.poll(position).not.toBe(hovered);
  const hoverPoint = await banner.locator('.gadget-pattern-item').evaluateAll(nodes => {
    const logo = document.querySelector('.gadget-banner-logo')!.getBoundingClientRect();
    const headerBottom = document.querySelector('.store-header')!.getBoundingClientRect().bottom;
    for (const node of nodes) {
      const box = node.getBoundingClientRect();
      const x = box.left + box.width / 2, y = box.top + box.height / 2;
      if (x < 40 || x > innerWidth - 40 || y < headerBottom + 20 || y > innerHeight - 20) continue;
      if (x > logo.left - 20 && x < logo.right + 20 && y > logo.top - 20 && y < logo.bottom + 20) continue;
      if (node.contains(document.elementFromPoint(x,y))) return {x,y};
    }
    return null;
  });
  expect(hoverPoint).not.toBeNull();
  await page.mouse.move(hoverPoint!.x, hoverPoint!.y);
  const hoveredProduct = banner.locator('.gadget-pattern-item:hover .gadget-product').first();
  await expect(hoveredProduct).toBeVisible();
  await expect.poll(()=>hoveredProduct.evaluate(node=>getComputedStyle(node).transform)).not.toBe('none');
  expect(await hoveredProduct.evaluate(node=>getComputedStyle(node).pointerEvents)).toBe('none');
  await page.waitForTimeout(250);
  await expect(hoveredProduct).toBeVisible();
  await banner.screenshot({path:'../docs/design-reference/homepage/gadget-banner-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await banner.screenshot({path:'../docs/design-reference/homepage/gadget-banner-mobile.png'});
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect.poll(()=>pattern.evaluate(node=>getComputedStyle(node).animationName)).toBe('none');
});

test("header navigation fits and section links clear the sticky header", async ({ page }) => {
 await page.goto('/', {waitUntil:'networkidle'});
 const header=page.locator('.store-header');
 const nav=page.getByRole('navigation',{name:'Shop categories'});
 await expect(nav.getByRole('link')).toHaveCount(10);
 expect(await nav.evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
 await nav.getByRole('link',{name:'Top Brands',exact:true}).click();
 await expect.poll(async()=>page.evaluate(()=>document.querySelector('#brands')!.getBoundingClientRect().top-document.querySelector('.store-header')!.getBoundingClientRect().bottom)).toBeGreaterThanOrEqual(0);
 await page.setViewportSize({width:390,height:844});
 await expect(nav).toBeHidden();
 await header.getByRole('button',{name:'Browse categories'}).click();
 await expect(nav).toBeVisible();
 await nav.getByRole('link',{name:'Mobiles & 5G',exact:true}).click();
 await expect(nav).toBeHidden();
 await expect.poll(async()=>page.evaluate(()=>document.querySelector('#smartphones')!.getBoundingClientRect().top-document.querySelector('.store-header')!.getBoundingClientRect().bottom)).toBeGreaterThanOrEqual(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await header.screenshot({path:'../docs/design-reference/homepage/header-mobile.png'});
 await page.setViewportSize({width:1440,height:1000});
 await header.screenshot({path:'../docs/design-reference/homepage/header-desktop.png'});
});

test('iOS category menu supports selection, keyboard and outside dismissal', async ({page}) => {
 await page.goto('/',{waitUntil:'networkidle'});
 const trigger=page.getByRole('button',{name:'All Categories',exact:true});
 await trigger.click();
 const menu=page.getByRole('menu',{name:'Search categories'});
 await expect(menu).toBeVisible();
 await page.getByRole('menuitemradio',{name:'All Categories',exact:true}).press('ArrowDown');
 await expect(page.getByRole('menuitemradio',{name:'Smartphones',exact:true})).toBeFocused();
 await page.keyboard.press('Enter');
 await expect(page.locator('#search-category')).toHaveValue('Smartphones');
 await expect(menu).toHaveCount(0);
 await page.getByRole('button',{name:'Smartphones',exact:true}).click();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('button',{name:'Smartphones',exact:true})).toBeFocused();
 await page.getByRole('button',{name:'Smartphones',exact:true}).click();
 await page.locator('.store-brand').click();
 await expect(menu).toHaveCount(0);
});

test('new category cards show complete product images on desktop and mobile', async ({page}) => {
 await page.goto('/',{waitUntil:'networkidle'});
 const section=page.locator('#categories');
 await section.scrollIntoViewIfNeeded();
 await expect(section.locator('.category-tile')).toHaveCount(10);
 await section.locator('img').evaluateAll(async images=>{
  await Promise.all(images.map(async image=>{if(image instanceof HTMLImageElement){image.loading='eager';await image.decode();}}));
 });
 expect(await section.locator('.category-product-preview img').evaluateAll(images=>images.every(image=>getComputedStyle(image).objectFit==='contain'))).toBe(true);
 await section.screenshot({path:'../docs/design-reference/homepage/categories-v2-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await section.screenshot({path:'../docs/design-reference/homepage/categories-v2-mobile.png'});
 await section.getByRole('link',{name:/Smartphones/}).click();
 await expect.poll(()=>page.evaluate(()=>document.querySelector('#smartphones')!.getBoundingClientRect().top-document.querySelector('.store-header')!.getBoundingClientRect().bottom)).toBeGreaterThanOrEqual(0);
});

test('storefront admin shortcut redirects to Django admin', async ({request}) => {
 const response=await request.get('/admin',{maxRedirects:0});
 expect(response.status()).toBe(307);
 expect(new URL(response.headers().location).pathname).toBe('/backend/django/admin/');
});
