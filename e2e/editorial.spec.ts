import { expect, test } from "@playwright/test";

test("collections are browsable and lead to matching published forms", async ({ page }) => {
  await page.goto("/collections");
  await expect(page.getByRole("heading", { name: /Ideas held together/ })).toBeVisible();
  await expect(page.locator(".editorial-collection-card")).toHaveCount(6);
  await page.locator(".editorial-collection-card").filter({ hasText: "Material Memory" }).click();
  await expect(page).toHaveURL(/\/collections\/material-memory$/);
  await expect(page.getByRole("heading", { name: "Material Memory" })).toBeVisible();
  await expect(page.locator(".collection-products .catalog-card")).toHaveCount(7);
  await page.getByRole("link", { name: /objects/ }).last().click();
  await expect(page).toHaveURL(/\/discover\/objects$/);
});

test("release page separates unscheduled studies and only renders real-date countdowns", async ({ page, request }) => {
  await page.goto("/drops");
  await expect(page.getByRole("heading", { name: /Made ready/ })).toBeVisible();
  await expect(page.locator(".drop-card--unannounced")).toHaveCount(3);
  await expect(page.locator(".drop-status-section--upcoming .drop-section-empty")).toContainText("No confirmed releases");
  await expect(page.locator(".drop-countdown")).toHaveCount(0);

  await page.getByRole("link", { name: "Notify me" }).first().click();
  await expect(page).toHaveURL(/\/drops\/material-memory-signal#notify$/);
  await page.getByRole("button", { name: "Notify me" }).click();
  await expect(page.locator(".drop-notify-form__message--error")).toContainText("Enter a valid email address.");
  await page.getByLabel("Your email address").fill("reader@example.com");
  await page.getByLabel("I agree to receive an update about this release.").check();
  await page.getByRole("button", { name: "Notify me" }).click();
  await expect(page.locator(".drop-notify-form__message--error")).toContainText("Drop notifications are not enabled");

  const invalid = await request.post("/api/drops/notify", { data: { dropSlug: "not-a-drop", email: "nope", consent: false } });
  expect(invalid.status()).toBe(400);
  const trapped = await request.post("/api/drops/notify", { data: { dropSlug: "not-a-drop", email: "bot@example.com", consent: true, company: "filled by a bot" } });
  expect(trapped.status()).toBe(202);
});

test("journal navigation, horizontal story rail, article and share actions work", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: { url: string }) => window.sessionStorage.setItem("shared-url", data.url),
    });
  });
  await page.goto("/stories");
  await expect(page.getByRole("heading", { name: /Form has/ })).toBeVisible();
  await expect(page.locator(".editorial-story-card--featured")).toHaveCount(1);
  await expect(page.locator(".story-rail__item")).toHaveCount(3);
  const rail = page.locator(".story-rail");
  await page.getByRole("button", { name: "Scroll stories right" }).click();
  await expect.poll(() => rail.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  await page.getByRole("link", { name: "Design philosophy", exact: true }).click();
  await expect(page).toHaveURL(/#story-category-design-philosophy$/);
  await page.locator(".editorial-story-card--featured").getByRole("link", { name: "The Space Between" }).click();
  await expect(page).toHaveURL(/\/stories\/the-space-between$/);
  await expect(page.getByRole("heading", { name: "The Space Between" })).toBeVisible();
  await expect(page.locator(".story-body blockquote")).toContainText("A considered object makes room");
  await page.getByRole("button", { name: "Share" }).first().click();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("shared-url"))).toContain("/stories/the-space-between");
});

test("editorial routes fit a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/collections", "/collections/material-memory", "/drops", "/drops/material-memory-signal", "/stories", "/stories/the-space-between"]) {
    await page.goto(route);
    const dimensions = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(dimensions.scrollWidth, `${route} should not overflow horizontally`).toBeLessThanOrEqual(dimensions.width + 1);
  }
});
