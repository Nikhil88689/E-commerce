import { Homepage } from "@/components/home/homepage";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "The Future of Commerce",
  description: "A future-facing concept archive for objects, ideas, and the space between them.",
  path: "/",
});

export default function HomePage() {
  return <Homepage />;
}
