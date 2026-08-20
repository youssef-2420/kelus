export function ProductMark({ label = "IPH", small = false }: { label?: string; small?: boolean }) {
  return <span className={small ? "product-mark product-mark-small" : "product-mark"} aria-hidden="true"><span>{label}</span></span>;
}
