import { KelusHeader } from "@/components/KelusHeader";
import { SearchControls } from "@/components/SearchControls";
import type { SearchCriteria } from "@/types/kelus";

type Props = {
  criteria: SearchCriteria;
};

export function ProductHeader({ criteria }: Props) {
  return (
    <div className="product-page-header">
      <KelusHeader />
      <div className="product-search-bar section">
        <SearchControls minimal minimalAction initialCriteria={criteria} actionLabel="Search" />
      </div>
    </div>
  );
}
