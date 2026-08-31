import { redirect } from "next/navigation";
import { canonicalProductPath, defaultSearch } from "@/lib/search-state";

export default function ComparePage() {
  redirect(canonicalProductPath(defaultSearch));
}
