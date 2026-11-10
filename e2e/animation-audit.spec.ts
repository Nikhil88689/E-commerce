import { expect, test } from "@playwright/test";

test("every storefront, customer, and admin route renders without a server error", async ({ page }) => {
  test.setTimeout(120_000);
  const routes = [
    "/",
    "/discover",
    "/discover/objects",
    "/discover/audio",
    "/discover/footwear",
    "/discover/living",
    "/discover/accessories",
    "/product/negative-space-vessel",
    "/product/negative-space-vessel/studio",
    "/collections",
    "/collections/edition-001",
    "/drops",
    "/drops/material-memory-signal",
    "/stories",
    "/stories/the-space-between",
    "/search",
    "/cart",
    "/checkout",
    "/checkout/confirmation?session_id=cs_test_vanta_audit",
    "/account",
    "/account/orders",
    "/account/orders/sample-order",
    "/account/wishlist",
    "/account/settings",
    "/login",
    "/register",
    "/admin",
    "/admin/products",
    "/admin/products/new",
    "/admin/products/sample-product",
    "/admin/orders",
    "/admin/orders/sample-order",
    "/admin/customers",
    "/admin/customers/sample-customer",
    "/admin/inventory",
    "/admin/discounts",
    "/admin/collections",
    "/admin/analytics",
    "/admin/content",
  ];

  for (const route of routes) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), `${route} should return a successful response`).toBeLessThan(500);
    await expect(page.locator("body"), `${route} should not render a server error`).not.toContainText("Internal Server Error");
    await expect(page.locator("main").first(), `${route} should expose page content`).toBeVisible();
  }
});

test("route and dialog motion stays interactive and disables with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("vanta-cursor-enabled"))).toBe(true);
  await page.mouse.move(700, 40);
  const cursor = page.locator("[data-vanta-cursor]");
  await expect(cursor).toHaveClass(/is-visible/);
  await page.getByRole("button", { name: "Discover" }).hover();
  await expect(cursor).toHaveClass(/is-labeled/);
  await expect(cursor.locator(".desktop-cursor__label")).toHaveText("EXPLORE");

  await page.getByRole("button", { name: "Discover" }).click();
  const menu = page.getByRole("dialog", { name: "Look closer." });
  await expect(menu).toBeVisible();
  await menu.getByRole("button", { name: "Close Look closer." }).click();
  await expect(menu).not.toBeVisible();

  await page.getByRole("button", { name: "Discover" }).click();
  await page.getByRole("dialog", { name: "Look closer." }).getByRole("link", { name: /Objects/ }).click();
  await expect(page).toHaveURL(/\/discover\/objects$/);
  await expect(page.locator(".page-transition")).toHaveCount(1);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("vanta-cursor-enabled"))).toBe(false);
  await expect(cursor).not.toHaveClass(/is-enabled/);
});

test("the story gallery pins into a horizontal sequence on large desktop and restores natural scrolling for reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/stories");
  const section = page.locator(".story-rail-section");
  const rail = page.locator(".story-rail");
  const track = page.locator(".story-rail__track");
  await expect(section).toBeVisible();
  await expect(rail).toHaveClass(/is-scroll-pinned/);

  await page.evaluate(() => {
    const node = document.querySelector<HTMLElement>(".story-rail-section");
    if (!node) return;
    window.scrollTo({ top: window.scrollY + node.getBoundingClientRect().top - 82 + 4, behavior: "instant" });
  });
  await expect.poll(() => section.evaluate((node) => getComputedStyle(node).position)).toBe("fixed");
  await page.evaluate(() => window.scrollBy({ top: 150, behavior: "instant" }));
  await expect.poll(() => track.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41)).toBeLessThan(-40);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(rail).not.toHaveClass(/is-scroll-pinned/);
  await expect(rail).toHaveCSS("overflow-x", "auto");
});
