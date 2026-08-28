import type { Metadata } from "next";
import LandingPage from "@/components/marketing/landing-page";

// No title here on purpose: the root layout's default is already "Einherji", and
// setting one would run it through the "%s · Einherji" template and produce the
// name twice. The description is the page's own thesis rather than a feature
// list, because that is what a search result and a shared link actually show.
export const metadata: Metadata = {
  description:
    "Einherji ranks every job posting it finds across nineteen boards, then hands you a queue you can clear with four keys.",
};

export default function RootPage() {
  return <LandingPage />;
}
