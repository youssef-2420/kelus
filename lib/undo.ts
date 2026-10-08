/**
 * The one thing that can be taken back right now, as in Notion: the Undo in a toast and ⌘Z (Ctrl+Z) do the same.
 * Only the latest change is kept, and only for as long as its toast is up.
 */
type Undo = { label: string; run: () => void; until: number };

let latest: Undo | null = null;

export function offerUndo(label: string, run: () => void, forMs = 6000) {
  latest = { label, run, until: Date.now() + forMs };
}

/** Runs the latest undo once. Returns its label, or null when there is nothing to take back. */
export function takeUndo(now = Date.now()) {
  const undo = latest;
  latest = null;
  if (!undo || now > undo.until) return null;
  undo.run();
  return undo.label;
}

export function clearUndo() {
  latest = null;
}

/** ⌘Z belongs to the text field while you type in one; only outside of fields does it undo a removal. */
export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}
