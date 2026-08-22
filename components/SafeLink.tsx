import type { AnchorHTMLAttributes } from "react";

type SafeLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string };

export function SafeLink({ href, children, ...props }: SafeLinkProps) {
  return <a href={href} {...props}>{children}</a>;
}
