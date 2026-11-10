import { expect, test } from "@playwright/test";

test("bag editing, discount estimates, five checkout steps, and safe missing-key failure", async ({ page }) => {
  await page.goto("/product/negative-space-vessel");
  await page.getByRole("button", { name: "Add to bag" }).click();
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: /Your bag, considered/ })).toBeVisible();
  await expect(page.locator(".cart-page__items .cart-line")).toHaveCount(1);
  await expect(page.getByText("$300", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Increase Negative Space Vessel quantity" }).click();
  await expect(page.locator(".cart-quantity output")).toHaveText("2");
  await expect(page.locator(".cart-summary__grand strong")).toHaveText("$588");
  await page.getByRole("button", { name: "Save for later" }).click();
  await expect(page.locator(".cart-page__items .cart-line")).toHaveCount(0);
  await page.getByRole("button", { name: "Move to bag" }).click();
  await expect(page.locator(".cart-page__items .cart-line")).toHaveCount(1);
  await page.locator("#discount-code").fill("VANTA10");
  await page.getByRole("button", { name: "Apply discount code" }).click();
  await expect(page.locator(".cart-summary__discount-total")).toContainText("VANTA10");
  await expect(page.locator(".cart-summary__grand strong")).toHaveText("$538");

  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await expect(page).toHaveURL(/\/checkout(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /Almost yours/ })).toBeVisible();
  await page.getByRole("button", { name: "Continue to delivery" }).click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  await page.getByLabel("Full name").fill("Avery Stone");
  await page.getByLabel("Email address").fill("avery@example.test");
  await page.getByRole("button", { name: "Continue to delivery" }).click();
  await expect(page.getByRole("heading", { name: /Where should it arrive/ })).toBeVisible();
  await page.getByLabel("Street address").fill("21 Mercer Street");
  await page.getByLabel("City").fill("New York");
  await page.getByLabel("State / Region").fill("NY");
  await page.getByLabel("Postal code").fill("10013");
  await page.getByRole("button", { name: "Choose shipping" }).click();
  await page.getByRole("radio", { name: /Express/ }).click();
  await expect(page.locator(".checkout-summary__totals")).toContainText("$554");
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page.getByText(/payment credentials are not configured/i)).toBeVisible();
  await page.getByRole("button", { name: "Review order" }).click();
  await expect(page.getByRole("heading", { name: /One last look/ })).toBeVisible();
  await page.getByRole("button", { name: "Continue to secure payment" }).click();
  await expect(page.locator(".checkout-flow__error")).toContainText(/Stripe test keys and a webhook signing secret are required/i);
  await page.goto("/cart");
  await expect(page.locator(".cart-page__items .cart-line")).toHaveCount(1);
  await expect(page.locator(".cart-quantity output")).toHaveText("2");
});

test("server quote ignores client submitted prices", async ({ request }) => {
  const response = await request.post("/api/checkout/quote", {
    data: {
      items: [{
        variantId: "untrusted", productSlug: "negative-space-vessel", quantity: 1, unitAmount: 1,
        configuration: { source: "product", colorName: "Stone", colorHex: "#b5ab9c", material: "Cast aluminum", finish: "Brushed", addOns: [], surchargeCents: 0, unitPriceCents: 1, summary: "free" },
      }],
      shippingMethod: "standard",
    },
  });
  expect(response.ok()).toBeTruthy();
  const result = await response.json();
  expect(result.quote.items[0].unitAmountCents).toBe(28800);
  expect(result.quote.items[0].configuration.unitPriceCents).toBe(28800);
  expect(result.quote.totalCents).toBe(30000);
});
