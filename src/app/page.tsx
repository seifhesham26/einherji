import { redirect } from "next/navigation";

// Root redirect — actual dashboard is at /dashboard to avoid route group conflict
export default function RootPage() {
  redirect("/dashboard");
}
