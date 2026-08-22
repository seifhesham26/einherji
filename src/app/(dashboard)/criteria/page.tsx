import type { Metadata } from "next";
import CriteriaForm from "@/components/criteria/criteria-form";

export const metadata: Metadata = { title: "Search Criteria" };

export default function CriteriaPage() {
  return <CriteriaForm />;
}
