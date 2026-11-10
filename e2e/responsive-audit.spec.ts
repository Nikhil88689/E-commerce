import { expect, test } from "@playwright/test";

const viewports = [
  { label: "desktop-1440", width: 1440, height: 1000 },
  { label: "laptop-1280", width: 1280, height: 900 },
  { label: "tablet-1024", width: 1024, height: 900 },
  { label: "tablet-768", width: 768, height: 900 },
  { label: "mobile-390", width: 390, height: 844 },
  { label: "mobile-360", width: 360, height: 780 },
];

const routes = [
  "/", "/discover", "/discover/objects", "/discover/audio", "/discover/footwear", "/discover/living", "/discover/accessories",
  "/product/afterlight", "/product/afterlight/studio", "/collections", "/collections/material-memory",
  "/drops", "/drops/signal-and-silence-listening", "/stories", "/stories/the-space-between", "/search",
  "/cart", "/checkout", "/checkout/confirmation", "/account", "/account/orders", "/account/orders/demo-order",
  "/account/wishlist", "/account/settings", "/login", "/register", "/admin", "/admin/products",
  "/admin/products/new", "/admin/products/demo-product", "/admin/orders", "/admin/orders/demo-order",
  "/admin/customers", "/admin/customers/demo-customer", "/admin/inventory", "/admin/discounts",
  "/admin/collections", "/admin/analytics", "/admin/content",
];

test("all application routes fit the launch viewport matrix", async ({ page }) => {
  test.setTimeout(240_000);
  page.setDefaultTimeout(10_000);
  const problems: string[] = [];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const route of routes) {
      try {
        await page.goto("about:blank", { waitUntil: "commit" });
        const response = await page.goto(route, { waitUntil: "load", timeout: 15_000 });
        await page.waitForTimeout(200);
        if (response && response.status() >= 500) problems.push(`${viewport.label} ${route}: HTTP ${response.status()}`);

        const metrics = await page.evaluate(() => ({
          viewportWidth: document.documentElement.clientWidth,
          documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
          title: document.title,
        }));
        if (metrics.documentWidth > metrics.viewportWidth + 1) {
          problems.push(`${viewport.label} ${route}: horizontal overflow ${metrics.documentWidth}px > ${metrics.viewportWidth}px`);
        }
        if (!metrics.title.trim()) problems.push(`${viewport.label} ${route}: missing document title`);

        if (route === "/" || route === "/product/afterlight/studio") {
          if (route.endsWith("/studio")) {
            await page.locator(".studio-viewer__stage canvas").waitFor({ state: "visible", timeout: 12_000 });
          }
          await page.screenshot({ path: `test-results/${route === "/" ? "home" : "studio"}-${viewport.label}.png`, fullPage: true, animations: "disabled" });
        }
      } catch (error) {
        problems.push(`${viewport.label} ${route}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  for (const width of [390, 360]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open navigation" }).click();
    const mobileNavigation = page.getByRole("dialog", { name: "Explore VANTA" });
    await expect(mobileNavigation).toBeVisible();
    await mobileNavigation.getByRole("button", { name: "Search the archive" }).click();
    const search = page.getByRole("dialog", { name: "Search VANTA" });
    await expect(search).toBeVisible();
    const searchBounds = await search.boundingBox();
    if (!searchBounds || searchBounds.x < 0 || searchBounds.x + searchBounds.width > width + 1 || searchBounds.y + searchBounds.height > 845) {
      problems.push(`mobile-${width} /search overlay: dialog extends beyond the viewport`);
    }
    await search.getByRole("button", { name: "Close Search VANTA" }).click();

    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("dialog", { name: "Explore VANTA" }).getByRole("button", { name: "Discover" }).click();
    const menu = page.getByRole("dialog", { name: "Look closer." });
    await expect(menu).toBeVisible();
    const menuBounds = await menu.boundingBox();
    if (!menuBounds || menuBounds.x < 0 || menuBounds.x + menuBounds.width > width + 1 || menuBounds.y + menuBounds.height > 845) {
      problems.push(`mobile-${width} /discover overlay: dialog extends beyond the viewport`);
    }
    await menu.getByRole("button", { name: "Close Look closer." }).click();

    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("dialog", { name: "Explore VANTA" }).getByRole("button", { name: /Shopping bag/ }).click();
    const bag = page.getByRole("dialog", { name: "The VANTA bag" });
    await expect(bag).toBeVisible();
    const bagBounds = await bag.boundingBox();
    if (!bagBounds || bagBounds.x < 0 || bagBounds.x + bagBounds.width > width + 1 || bagBounds.y + bagBounds.height > 845) {
      problems.push(`mobile-${width} cart drawer: dialog extends beyond the viewport`);
    }
    await bag.getByRole("button", { name: "Close The VANTA bag" }).click();
  }

  expect(problems, problems.join("\n")).toEqual([]);
});
