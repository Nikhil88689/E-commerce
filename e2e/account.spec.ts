import { expect, test } from "@playwright/test";

test("customer pages require a Supabase session", async ({ page }) => {
  for (const route of ["/account", "/account/orders", "/account/wishlist", "/account/settings", "/account/orders/sample-order"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login\?next=/);
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
  }
});

test("login and registration validate fields and report unavailable Auth clearly", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Enter a valid email address.", { exact: true })).toBeVisible();
  await expect(page.getByText("Enter your password.", { exact: true })).toBeVisible();

  await page.getByLabel("Email address").fill("customer@example.com");
  await page.locator('input[autocomplete="current-password"]').fill("safe-demo-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator(".auth-feedback--error")).toContainText(/Customer sign in is unavailable|We could not verify/);

  await page.goto("/register");
  await page.getByLabel("Full name").fill("Avery Stone");
  await page.getByLabel("Email address").fill("customer@example.com");
  const registrationForm = page.locator(".auth-form");
  await registrationForm.locator('input[autocomplete="new-password"]').nth(0).fill("first-password");
  await registrationForm.locator('input[autocomplete="new-password"]').nth(1).fill("different-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Passwords do not match.", { exact: true })).toBeVisible();
});

test("account APIs validate input and never return data without a session", async ({ request }) => {
  for (const route of ["/api/account/profile", "/api/account/addresses", "/api/account/orders", "/api/account/wishlist"]) {
    const response = await request.get(route);
    expect([401, 503]).toContain(response.status());
    expect(await response.json()).toHaveProperty("error");
  }

  const invalidProfile = await request.put("/api/account/profile", { data: { fullName: "", email: "invalid", phone: "abc", emailMarketing: true, orderUpdates: true } });
  expect(invalidProfile.status()).toBe(400);

  const invalidWishlist = await request.post("/api/account/wishlist", { data: { productSlug: "not a slug" } });
  expect(invalidWishlist.status()).toBe(400);
});
