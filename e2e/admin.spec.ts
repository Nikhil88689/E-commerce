import { expect, test } from "@playwright/test";

test("admin workspace does not expose management without an authenticated admin role", async ({ page, request }) => {
  const response = await request.get("/api/admin/products");
  expect([401, 403, 503]).toContain(response.status());
  const body = await response.json();
  expect(body.error).toBeTruthy();

  await page.goto("/admin");
  if (new URL(page.url()).pathname === "/login") {
    await expect(page).toHaveURL(/\/login\?next=/);
  } else {
    await expect(page.getByRole("heading", { name: /Command center offline|Access restricted/ })).toBeVisible();
  }
});

test("admin write APIs check access before accepting a mutation", async ({ request }) => {
  const response = await request.post("/api/admin/products", { data: { slug: "invalid" } });
  expect([401, 403, 503]).toContain(response.status());
  expect((await response.json()).error).toBeTruthy();
});
