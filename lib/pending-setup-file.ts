/** A file chosen while the sample course was open, waiting for the real setup screen to pick it up. */
let pending: File | null = null;

export function setPendingSetupFile(file: File | null) { pending = file; }

export function takePendingSetupFile() {
  const file = pending;
  pending = null;
  return file;
}
