import type { Metadata } from "next";
import { MaterialLibrary } from "@/components/MaterialLibrary";
import { LateralPage } from "@/components/PageTransition";

export const metadata: Metadata = {
  title: "Course material — Kelus",
  description: "Keep course PDFs, videos, and useful links together with your Kelus destination.",
  robots: { index: false, follow: false },
};

export default function MaterialsPage() {
  return <LateralPage><MaterialLibrary /></LateralPage>;
}
