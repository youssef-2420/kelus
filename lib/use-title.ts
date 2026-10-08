"use client";

import { useEffect } from "react";

/**
 * Names the browser tab for the screen you are on. Next writes the page's static title after navigation, so the
 * title is set again whenever something else replaces it, for as long as the screen is open.
 */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    let active = true;
    const apply = () => { if (active && document.title !== title) document.title = title; };
    apply();
    const frame = requestAnimationFrame(apply);
    const head = document.querySelector("head");
    const observer = new MutationObserver(apply);
    if (head) observer.observe(head, { subtree: true, childList: true, characterData: true });
    // Leaving the screen gives the tab back its page's own title: a removed course never lingers in the tab.
    return () => { active = false; cancelAnimationFrame(frame); observer.disconnect(); if (document.title === title) document.title = previous; };
  }, [title]);
}
