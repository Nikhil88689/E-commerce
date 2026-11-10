"use client";

import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";

export function CatalogError({ message }: Readonly<{ message: string }>) {
  const router = useRouter();
  return (
    <div className="catalog-state catalog-state--error" role="alert">
      <p className="eyebrow">Catalog / Connection interrupted</p>
      <h2>We lost the signal.</h2>
      <p>{message}</p>
      <button className="button button--outline" type="button" onClick={() => router.refresh()}>
        Try again <RotateCw aria-hidden="true" size={15} />
      </button>
    </div>
  );
}
