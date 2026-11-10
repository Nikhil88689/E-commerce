import { expect, test } from "@playwright/test";
import axe from "axe-core";

type AxeViolation = { id: string; impact: string | null; help: string; nodes: Array<{ target: string[]; any?: Array<{ message: string; data?: unknown }> }> };
type WindowWithAxe = Window & {
  axe: { run: (context: Document, options: { runOnly: { type: "tag"; values: string[] } }) => Promise<{ violations: AxeViolation[] }> };
};

test("keyboard users can reach the skip link and operate a search dialog", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skipLink = page.locator(".skip-link");
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  const focusOutline = await skipLink.evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(focusOutline).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);

  await page.goto("/");
  await page.getByRole("button", { name: "Search" }).focus();
  await page.keyboard.press("Enter");
  const search = page.getByRole("dialog", { name: "Search VANTA" });
  await expect(search).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(search).not.toBeVisible();
});

test("all application routes pass axe WCAG 2.1 A/AA checks at mobile width", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 844 });
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
  const violations: string[] = [];

  for (const route of routes) {
    await page.goto("about:blank", { waitUntil: "commit" });
    await page.goto(route, { waitUntil: "load" });
    await page.waitForTimeout(200);
    await page.addScriptTag({ content: axe.source });
    const results = await page.evaluate(async () => {
      const runner = (window as unknown as WindowWithAxe).axe;
      const result = await runner.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
      return result.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        description: violation.help,
        elements: violation.nodes.map((node) => ({
          target: node.target.join(" "),
          contrast: violation.id === "color-contrast" ? node.any?.map((check) => {
            const data = check.data as { fgColor?: string; bgColor?: string; contrastRatio?: number } | undefined;
            return data ? `${data.fgColor} on ${data.bgColor} (${data.contrastRatio})` : null;
          }).filter(Boolean) : undefined,
        })).slice(0, 12),
      }));
    });
    violations.push(...results.map((violation) => `${route}: ${violation.impact} ${violation.id} (${violation.description}) at ${JSON.stringify(violation.elements)}`));
  }

  expect(violations, violations.join("\n")).toEqual([]);
});
