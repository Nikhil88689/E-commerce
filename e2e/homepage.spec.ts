import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("renders the complete concept archive and responsive sections", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "A better object changes how the everyday feels." })).toBeAttached();
  await expect(page.getByRole("heading", { name: "Ideas in form." })).toBeVisible();
  await expect(page.locator(".concept-card")).toHaveCount(4);
  await expect(page.locator(".world-card")).toHaveCount(5);
  await expect(page.getByRole("heading", { name: "Nothing drops until it’s ready." })).toBeAttached();
  await expect(page.getByRole("heading", { name: "Not more things. More meaning in the things we choose." })).toBeAttached();
  await expect(page.getByRole("heading", { name: "The next signal, direct to you." })).toBeAttached();

  const conceptImages = page.locator(".concept-card img");
  await expect(conceptImages).toHaveCount(4);
  await expect(conceptImages.first()).toBeVisible();
});

test("opens the full-screen menu and follows a discover destination", async ({ page }) => {
  await page.getByRole("button", { name: "Discover" }).click();
  const menu = page.getByRole("dialog", { name: "Look closer." });
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: /All directions/ }).click();
  await expect(menu).not.toBeVisible();
  await expect(page).toHaveURL(/\/discover$/);
});

test("searches products live and opens the matching product detail", async ({ page }) => {
  await page.getByRole("button", { name: "Search" }).click();
  const dialog = page.getByRole("dialog", { name: "Search VANTA" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("searchbox").fill("afterlight");
  await dialog.getByRole("link", { name: "Afterlight Living · Demo" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/\/product\/afterlight$/);
  await expect(page.getByRole("heading", { name: "Afterlight", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Unavailable in demo stock" })).toBeDisabled();
  await expect(page.locator(".product-detail__info > .product-detail__demo-note")).toContainText(/secure Stripe test checkout/i);
});

test("saves a concept locally and follows a product world to its category page", async ({ page }) => {
  const save = page.getByRole("button", { name: "Save Resonance / 01 to your inspiration list" });
  await save.click();
  await expect(page.getByRole("button", { name: "Remove Resonance / 01 from your inspiration list" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("vanta:saved-concepts:v1"))).toContain("resonance-one");

  await page.locator(".world-card--audio").click();
  await expect(page).toHaveURL(/\/discover\/audio$/);
  await expect(page.getByRole("heading", { name: "A world of audio." })).toBeVisible();
  await expect(page.locator(".catalog-card")).toHaveCount(6);
});

test("cart preview and customer account entry points work", async ({ page }) => {
  await page.getByRole("button", { name: "Shopping bag, 0 items" }).click();
  const cart = page.getByRole("dialog", { name: "The VANTA bag" });
  await expect(cart.getByRole("heading", { name: "Your bag is empty." })).toBeVisible();
  await cart.getByRole("button", { name: "Close The VANTA bag" }).click();

  await page.getByRole("button", { name: "Account" }).click();
  const account = page.getByRole("dialog", { name: "Your VANTA account" });
  await expect(account.getByText(/Your archive,/)).toBeVisible();
  await expect(account.getByText(/Customer accounts are not enabled|Keep your orders|Signed in as/)).toBeVisible();
});

test("validates newsletter consent and reports the unconfigured service honestly", async ({ page }) => {
  await page.getByRole("button", { name: "Join the list" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();

  await page.getByLabel("Email address").fill("reader@example.com");
  await page.getByLabel("I agree to receive VANTA launch updates by email.").check();
  await page.getByRole("button", { name: "Join the list" }).click();
  await expect(page.locator(".newsletter-form__server-error")).toHaveText("Newsletter signup is not enabled until Supabase and a privacy contact are configured.");
  await expect(page.locator(".newsletter-success")).toHaveCount(0);
});

test("mobile navigation opens the menu and transfers to the mega menu safely", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  const mobileMenu = page.getByRole("dialog", { name: "Explore VANTA" });
  await expect(mobileMenu).toBeVisible();
  await mobileMenu.getByRole("button", { name: /Collections/ }).click();

  const megaMenu = page.getByRole("dialog", { name: "One idea, many forms." });
  await expect(megaMenu).toBeVisible();
  await megaMenu.getByRole("link", { name: /Edition 001/ }).click();
  await expect(megaMenu).not.toBeVisible();
  await expect(page).toHaveURL(/\/collections\/edition-001$/);

  const dimensions = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 1);
});

test("filters are functional, shareable, and restored by browser history", async ({ page }) => {
  await page.goto("/discover");
  await expect(page.getByRole("heading", { name: "A world in form." })).toBeVisible();
  await expect(page.locator(".catalog-card")).toHaveCount(8);
  await page.getByRole("button", { name: /Filters/ }).click();
  const filters = page.getByRole("dialog", { name: "Refine the index" });
  await filters.getByLabel("World").selectOption("objects");
  await filters.getByLabel("Minimum price in dollars").fill("500");
  await filters.getByLabel("Maximum price in dollars").fill("200");
  await filters.getByRole("button", { name: /Apply filters/ }).click();
  await expect(filters.getByRole("alert")).toHaveText("The minimum price must be lower than the maximum.");

  await filters.getByLabel("Minimum price in dollars").fill("250");
  await filters.getByLabel("Maximum price in dollars").fill("350");
  await filters.getByLabel("Availability").selectOption("in-stock");
  await filters.getByLabel("Color").selectOption("Stone");
  await filters.getByLabel("Material").selectOption("Cast aluminum");
  await filters.getByLabel("Rating").selectOption("4.5");
  await filters.getByRole("button", { name: /Apply filters/ }).click();
  await expect(page).toHaveURL(/category=objects.*minPrice=250.*maxPrice=350.*availability=in-stock.*color=Stone.*material=Cast\+aluminum.*rating=4.5/);
  await expect(page.locator(".catalog-card")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Negative Space Vessel" })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/discover$/);
  await expect(page.locator(".catalog-card")).toHaveCount(8);
});

test("sorts results, loads the next page, and supports a shared category URL", async ({ page }) => {
  await page.goto("/discover?sort=price-low");
  await expect(page.locator(".catalog-card").first().getByRole("heading", { name: "Meridian Strap Set" })).toBeVisible();
  await page.goto("/discover?sort=price-high");
  await expect(page.locator(".catalog-card").first().getByRole("heading", { name: "Orbit Floor Light" })).toBeVisible();
  await page.goto("/discover?sort=best-selling");
  await expect(page.locator(".catalog-card").first().getByRole("heading", { name: "Index Card Case" })).toBeVisible();
  await page.goto("/discover?sort=newest");
  await expect(page.locator(".catalog-card").first().getByRole("heading", { name: "Monolith Catchall" })).toBeVisible();
  await page.goto("/discover?sort=featured");
  await page.getByRole("button", { name: /Load more/ }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator(".catalog-card")).toHaveCount(16);
  await page.goto("/discover/objects");
  await expect(page.locator(".catalog-card")).toHaveCount(6);
  await expect(page.locator(".catalog-world-nav").getByRole("link", { name: /Objects/ })).toHaveAttribute("aria-current", "page");
});

test("all five category routes show distinct artwork and matching products", async ({ page }) => {
  const categoryImages: Record<string, string> = {
    objects: "object-concept.webp",
    audio: "audio-concept.webp",
    footwear: "footwear-concept.webp",
    living: "living-concept.webp",
    accessories: "accessories-concept.webp",
  };
  for (const [slug, image] of Object.entries(categoryImages)) {
    await page.goto(`/discover/${slug}`);
    await expect(page.getByRole("heading", { name: new RegExp(`A world of ${slug}\\.`) })).toBeVisible();
    await expect(page.locator(".catalog-card")).toHaveCount(6);
    await expect(page.locator(".catalog-hero__image img")).toHaveAttribute("src", new RegExp(image));
  }
  await page.goto("/discover?minPrice=9999");
  await expect(page.getByRole("heading", { name: "Try another direction." })).toBeVisible();
  await expect(page.locator(".catalog-card")).toHaveCount(0);
});

test("product cards switch views, save to wishlist, quick add, and respect stock", async ({ page }) => {
  await page.goto("/discover");
  const vessel = page.locator(".catalog-card").filter({ has: page.getByRole("heading", { name: "Negative Space Vessel" }) });
  await vessel.hover();
  await expect(vessel.getByRole("button", { name: "Show product view 2" })).toHaveAttribute("aria-pressed", "true");
  await vessel.getByRole("button", { name: "Save Negative Space Vessel to wishlist" }).click();
  await expect(vessel.getByRole("button", { name: "Remove Negative Space Vessel from wishlist" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("vanta:wishlist:v1"))).toContain("demo-negative-space-vessel");
  await vessel.getByRole("button", { name: "Quick add Negative Space Vessel" }).click();
  await expect(vessel.getByRole("button", { name: "Added Negative Space Vessel" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Shopping bag, 1 items" })).toBeVisible();

  const afterlight = page.locator(".catalog-card").filter({ has: page.getByRole("heading", { name: "Afterlight" }) });
  await expect(afterlight.getByRole("button", { name: /unavailable in demo stock/ })).toBeDisabled();
});

test("live search includes product and collection results, recents, and no-results state", async ({ page }) => {
  await page.getByRole("button", { name: "Search" }).click();
  const dialog = page.getByRole("dialog", { name: "Search VANTA" });
  await dialog.getByRole("searchbox").fill("material memory");
  await expect(dialog.getByRole("heading", { name: /Collections/ })).toBeVisible();
  await dialog.getByRole("searchbox").fill("this-will-never-match");
  await expect(dialog.getByText(/No products or collections match/)).toBeVisible();
  await dialog.getByRole("searchbox").fill("Meridian");
  await expect(dialog.getByRole("link", { name: /Meridian Watch/ })).toBeVisible();
  await dialog.getByRole("link", { name: /Meridian Watch/ }).click();
  await expect(page).toHaveURL(/\/product\/meridian-watch$/);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(dialog.getByRole("button", { name: "Meridian", exact: true })).toBeVisible();
});

test("mobile discovery has no horizontal overflow and the filter drawer applies", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/discover");
  await page.getByRole("button", { name: /Filters/ }).click();
  const filters = page.getByRole("dialog", { name: "Refine the index" });
  await filters.getByLabel("Availability").selectOption("sold-out");
  await filters.getByRole("button", { name: /Apply filters/ }).click();
  await expect(page).toHaveURL(/availability=sold-out/);
  await expect(page.locator(".catalog-card")).toHaveCount(3);
  const dimensions = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 1);
});
