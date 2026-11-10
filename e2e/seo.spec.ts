import { expect, test } from "@playwright/test";

test("public routes publish route-specific metadata and canonical URLs", async ({ page }) => {
  const cases = [
    { path: "/", canonical: "/", title: /Future of Commerce.*VANTA/i },
    { path: "/discover/objects", canonical: "/discover/objects", title: /Objects.*Discover/i },
    { path: "/product/afterlight", canonical: "/product/afterlight", title: /Afterlight.*VANTA/i },
    { path: "/collections/material-memory", canonical: "/collections/material-memory", title: /Material Memory.*VANTA/i },
    { path: "/stories/the-space-between", canonical: "/stories/the-space-between", title: /The Space Between.*VANTA/i },
  ];

  for (const item of cases) {
    await page.goto(item.path);
    await expect(page).toHaveTitle(item.title);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toBeTruthy();
    const canonicalPath = new URL(canonical!).pathname.replace(/\/$/, "") || "/";
    expect(canonicalPath).toBe(item.canonical.replace(/\/$/, "") || "/");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.+/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /VANTA/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image|\/images\//);
  }
});

test("private and utility routes are excluded from search indexing", async ({ page }) => {
  for (const path of ["/cart", "/checkout", "/account", "/login", "/search"]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
});

test("robots and sitemap endpoints use the configured site origin and public catalog", async ({ request }) => {
  const openGraph = await request.get("/opengraph-image");
  expect(openGraph.ok()).toBeTruthy();
  expect(openGraph.headers()["content-type"]).toContain("image/png");

  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  const robotsText = await robots.text();
  expect(robotsText).toContain("Disallow: /admin");
  expect(robotsText).toContain("Disallow: /account");
  expect(robotsText).toContain("/sitemap.xml");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain("/product/afterlight");
  expect(sitemapText).toContain("/discover/objects");
  expect(sitemapText).not.toContain("/account");
  expect(sitemapText).not.toContain("/admin");
});
