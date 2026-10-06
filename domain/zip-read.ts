/**
 * A small zip reader for exports (Notion, Obsidian). It reads the central directory, then inflates one
 * entry at a time with the platform's own decompressor, so no library is needed. Sizes are capped while
 * reading, so a file that lies about its size cannot fill memory.
 */

export type ZipEntry = { path: string; size: number; read: (maxBytes?: number) => Promise<Uint8Array> };

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;
export const MAX_ENTRY_BYTES = 8 * 1024 * 1024;

export class ZipError extends Error {}

async function inflateRaw(data: Uint8Array, limit: number) {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) { await reader.cancel(); throw new ZipError("A file inside the zip is too large."); }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength; }
  return out;
}

export function listZip(input: ArrayBuffer | Uint8Array): ZipEntry[] {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let at = bytes.byteLength - 22; at >= Math.max(0, bytes.byteLength - 22 - 65535); at -= 1) {
    if (view.getUint32(at, true) === EOCD) { end = at; break; }
  }
  if (end < 0) throw new ZipError("This does not look like a zip file.");
  const count = view.getUint16(end + 10, true);
  const directoryOffset = view.getUint32(end + 16, true);
  if (count === 0xffff || directoryOffset === 0xffffffff) throw new ZipError("This zip is too large to read here. Export fewer pages.");

  const decoder = new TextDecoder("utf-8");
  const entries: ZipEntry[] = [];
  let at = directoryOffset;
  for (let index = 0; index < count; index += 1) {
    if (at + 46 > bytes.byteLength || view.getUint32(at, true) !== CENTRAL) throw new ZipError("This zip is damaged.");
    const method = view.getUint16(at + 10, true);
    const flags = view.getUint16(at + 8, true);
    const compressed = view.getUint32(at + 20, true);
    const size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const localOffset = view.getUint32(at + 42, true);
    const path = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    at += 46 + nameLength + extraLength + commentLength;
    if (path.endsWith("/")) continue;
    if ((flags & 1) !== 0) throw new ZipError("This zip is password protected.");

    entries.push({
      path,
      size,
      read: async (maxBytes = MAX_ENTRY_BYTES) => {
        if (size > maxBytes) throw new ZipError("A file inside the zip is too large.");
        if (localOffset + 30 > bytes.byteLength || view.getUint32(localOffset, true) !== LOCAL) throw new ZipError("This zip is damaged.");
        const start = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
        const body = bytes.subarray(start, start + compressed);
        if (method === 0) return body.slice();
        if (method === 8) return inflateRaw(body, maxBytes);
        throw new ZipError("This zip uses a compression Kelus can’t read.");
      },
    });
  }
  return entries;
}
