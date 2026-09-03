"use client";

import { Icon } from "@/components/Icon";
import { dispatchPrefillSearch } from "@/components/DeskPickActions";
import type { ConditionFilter } from "@/types/kelus";

type Props = {
  productName: string;
  variantLabel: string;
  condition: ConditionFilter;
  productSlug: string;
  variantId: string;
};

function conditionLabel(condition: ConditionFilter) {
  if (condition === "any") return "Any";
  return condition.charAt(0).toUpperCase() + condition.slice(1);
}

export function DeskTryExample({ productName, variantLabel, condition, productSlug, variantId }: Props) {
  return (
    <button
      type="button"
      className="desk-try-example"
      onClick={() => dispatchPrefillSearch({ productSlug, variantId, condition })}
    >
      <span className="desk-try-example-label">Try an example</span>
      <span className="desk-try-example-setup">
        {productName} · {variantLabel} · {conditionLabel(condition)}
      </span>
      <Icon name="arrow" size={14} />
    </button>
  );
}
