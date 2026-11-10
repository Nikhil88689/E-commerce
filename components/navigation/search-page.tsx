"use client";

import { useRouter } from "next/navigation";
import { SearchDialog } from "@/components/navigation/search-dialog";

export function SearchPageContent() {
  const router = useRouter();
  return (
    <main id="main-content" className="search-page">
      <p className="eyebrow">VANTA / Search</p>
      <SearchDialog open onClose={() => router.push("/discover")} />
    </main>
  );
}
