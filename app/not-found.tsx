import Link from "next/link";

export default function NotFound() {
  return (
    <main className="error-screen">
      <p className="eyebrow">404 / Out of frame</p>
      <h1>This page isn’t here.</h1>
      <Link className="text-link" href="/">
        Return to VANTA
      </Link>
    </main>
  );
}
