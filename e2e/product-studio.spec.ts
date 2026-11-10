import { expect, test } from "@playwright/test";

test("product detail gallery, variants, quantity, wishlist, and checkout work together", async ({ page }) => {
  await page.goto("/product/vector-form");
  await expect(page.getByRole("heading", { name: "Vector Form", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show product image 2" }).click();
  await expect(page.getByText("02 / 02")).toBeVisible();
  await page.getByRole("button", { name: "Select Ash" }).click();
  await expect(page.getByRole("button", { name: "Select Ash" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Size guide" }).click();
  await expect(page.getByText(/Sample fit guide/)).toBeVisible();
  await page.getByRole("button", { name: "Select US size 43" }).click();
  await expect(page.getByRole("button", { name: "Select US size 43" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await expect(page.locator(".product-detail__quantity output")).toHaveText("2");
  await page.getByRole("button", { name: "Save Vector Form to wishlist" }).click();
  await expect(page.getByRole("button", { name: "Remove Vector Form from wishlist" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Add to bag" }).click();
  await expect(page.getByRole("button", { name: "Shopping bag, 2 items" })).toBeVisible();
  await page.getByRole("button", { name: "Buy now" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("heading", { name: /Almost yours/ })).toBeVisible();
  await expect(page.locator(".checkout-summary__items")).toContainText(/Ash.*Technical knit.*Brushed.*Size 43/);
});

test("studio changes the rendered model, price, saved configuration, and bag line", async ({ page }) => {
  await page.goto("/product/negative-space-vessel/studio");
  await expect(page.locator(".studio-model-heading h1")).toHaveText("Negative Space Vessel");
  await expect(page.locator(".studio-viewer__stage canvas")).toBeVisible();
  await page.getByRole("button", { name: "side", exact: true }).click();
  await expect(page.getByRole("button", { name: "side", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(page.locator(".studio-viewer__zoom")).toContainText("112%");

  await page.getByRole("button", { name: "Choose Graphite" }).click();
  await page.getByRole("button", { name: /Anodized aluminum/ }).click();
  await page.getByRole("button", { name: /Polished/ }).click();
  await page.getByRole("button", { name: /Display plinth/ }).click();
  await expect(page.locator(".studio-price-line strong")).toHaveText("$396");
  await expect(page.locator(".studio-summary-details")).toContainText("Graphite");
  await page.getByRole("button", { name: "Save configuration" }).click();
  await expect(page.locator(".studio-save-status")).toContainText("Saved on this device");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("vanta-studio:negative-space-vessel:v1"))).toContain("Graphite");

  await page.getByRole("button", { name: "Add configuration to bag" }).click();
  await expect(page.getByRole("button", { name: "Shopping bag, 1 items" })).toBeVisible();
  await page.getByRole("button", { name: "Continue to checkout" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.locator(".checkout-summary__items")).toContainText(/Graphite.*Anodized aluminum.*Polished.*Display plinth/);
  await expect(page.locator(".checkout-summary__items")).toContainText("$396");
});

test("mobile studio uses a bottom sheet and avoids horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/product/negative-space-vessel/studio");
  await expect(page.locator(".studio-viewer__stage canvas")).toBeVisible();
  await page.getByRole("button", { name: "Configure" }).click();
  const sheet = page.getByRole("dialog", { name: "Configure your form" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Choose Graphite" }).click();
  await expect(sheet.getByRole("button", { name: "Choose Graphite" })).toHaveAttribute("aria-pressed", "true");
  const sheetBounds = await sheet.boundingBox();
  expect(sheetBounds?.height).toBeGreaterThan(500);
  await sheet.getByRole("button", { name: "Close Configure your form" }).click();
  const dimensions = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 1);
});
