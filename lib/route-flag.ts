/** Cookie hint so /today can paint a restore shell instead of first-run chrome. */
export const ROUTE_FLAG = "kelus-has-route";

export function setHasRouteFlag() {
  if (typeof document === "undefined") return;
  document.cookie = `${ROUTE_FLAG}=1; path=/; max-age=31536000; SameSite=Lax`;
}

export function clearHasRouteFlag() {
  if (typeof document === "undefined") return;
  document.cookie = `${ROUTE_FLAG}=; path=/; max-age=0; SameSite=Lax`;
}
