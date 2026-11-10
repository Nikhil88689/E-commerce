"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="error-screen">
      <p className="eyebrow">Something interrupted the experience</p>
      <h1>Let’s try that again.</h1>
      <button className="text-link error-screen__button" onClick={reset}>
        Reload this view
      </button>
    </main>
  );
}
