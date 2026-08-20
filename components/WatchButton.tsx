"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

const key = "kelus-watched-products";

export function WatchButton({ product = "iPhone 17" }: { product?: string }) {
  const [saved, setSaved] = useState(() => typeof window !== "undefined" && JSON.parse(window.localStorage.getItem(key) ?? "[]").includes(product));
  function toggle() {
    const current: string[] = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    const next = current.includes(product) ? current.filter((item) => item !== product) : [...current, product];
    window.localStorage.setItem(key, JSON.stringify(next));
    setSaved(next.includes(product));
  }
  return <button className={saved ? "watch-button is-saved" : "watch-button"} type="button" onClick={toggle}><Icon name={saved ? "check" : "bell"} size={16} />{saved ? "Watching price" : "Track price"}</button>;
}
