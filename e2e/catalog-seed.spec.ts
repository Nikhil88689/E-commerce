import { expect, test } from "@playwright/test";

test("the sample catalog contains thirty searchable products across categories", async ({ page }) => {
  await page.goto("/discover");
  await expect(page.getByText("30 sample designs / USD")).toBeVisible();
  await expect(page.getByText("Showing 8 of 30 sample pieces")).toBeVisible();

  await page.goto("/discover?q=hush");
  await expect(page.locator(".catalog-card")).toContainText("Hush / In-ear");

  await page.goto("/discover/footwear?availability=low-stock");
  await expect(page.locator(".catalog-card")).toHaveCount(2);
  await expect(page.locator(".catalog-card")).toContainText(["Traverse / 01", "Transit Shell"]);
});
