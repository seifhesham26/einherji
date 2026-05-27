import { redirect } from "next/navigation";

// Route group (dashboard) also maps to "/" — defer to /dashboard to avoid conflict with the landing page at app/page.tsx
export default function RootGroupPage() {
  redirect("/dashboard");
}
