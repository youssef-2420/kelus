import { KelusHeader } from "@/components/KelusHeader";
import { SearchControls } from "@/components/SearchControls";
import type { SearchCriteria } from "@/types/kelus";

type Props = {
  criteria: SearchCriteria;
};

export function ProductHeader({ criteria }: Props) {
  return (
    <>
      <KelusHeader />
      <section className="product-search-dock" aria-label="Search another product">
        <div className="product-search-dock-inner section">
          <div className="product-search-dock-copy">
            <span>Comparing now</span>
            <strong>Search another product</strong>
          </div>
          <div className="product-search-bar">
            <SearchControls minimal minimalAction initialCriteria={criteria} actionLabel="Search" />
          </div>
        </div>
      </section>
    </>
  );
}
