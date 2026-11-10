import { NextResponse } from "next/server";
import { getCatalogCollections, getCatalogProducts } from "@/lib/catalog/service";
import { checkPublicRateLimit } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim().slice(0, 80);
  if (!query) return NextResponse.json({ products: [], collections: [], query: "" });
  const limit = await checkPublicRateLimit(request, "search");
  if (limit === "limited") return NextResponse.json({ error: "Search is being requested too often. Try again shortly." }, { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });
  if (limit === "unavailable") return NextResponse.json({ error: "Search is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });

  const [result, collectionResult] = await Promise.all([
    getCatalogProducts({ q: query, page: 1, pageSize: 5, sort: "featured" }),
    getCatalogCollections(query),
  ]);
  if (result.error || collectionResult.error) return NextResponse.json({ error: result.error ?? collectionResult.error }, { status: 503 });
  const matchingCollections = collectionResult.collections.slice(0, 3);
  return NextResponse.json({
    query,
    products: result.products.map((product) => ({
      slug: product.slug,
      name: product.name,
      category: product.categoryName,
      image: product.images[0],
    })),
    collections: matchingCollections.map(({ imageUrl, ...collection }) => ({ ...collection, image: imageUrl })),
  }, { headers: { "Cache-Control": "private, max-age=0, must-revalidate" } });
}
