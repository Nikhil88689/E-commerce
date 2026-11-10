import type { Metadata } from "next";
import { SearchPageContent } from "@/components/navigation/search-page";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Search",
  description: "Search the VANTA product archive and editorial collections.",
  path: "/search",
  noIndex: true,
});

export default function SearchPage() {
  return <SearchPageContent />;
}
