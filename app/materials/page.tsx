import type { Metadata } from "next";
import { MaterialsClient } from "@/components/MaterialsClient";
import { LateralPage } from "@/components/PageTransition";

export const metadata: Metadata = {
  title: "Course material — Kelus",
  description: "Keep course PDFs, videos, and useful links together with your Kelus destination.",
  robots: { index: false, follow: false },
};

export default function MaterialsPage() {
  return (
    <LateralPage>
      <MaterialsClient />
    </LateralPage>
  );
}
