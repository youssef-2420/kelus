export function CatalogAvailabilityLegend() {
  return (
    <div className="catalog-availability-legend" aria-label="Coverage legend">
      <span><i className="is-validated" aria-hidden="true" />Validated comparison — Kelus has saved live offers for this product</span>
      <span><i className="is-indexed" aria-hidden="true" />View comparison — indexed product, offers not saved yet</span>
    </div>
  );
}
