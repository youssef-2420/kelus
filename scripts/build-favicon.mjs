import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

// Keep the early-loading browser fallback in sync with the SVG used by the header/tab.
const svg = await readFile(new URL("../app/icon.svg", import.meta.url));
const sizes = [16, 32, 48, 64];
const images = await Promise.all(sizes.map((size) => sharp(svg).resize(size, size).png().toBuffer()));
const directory = Buffer.alloc(6 + images.length * 16);
directory.writeUInt16LE(1, 2); // icon, not cursor
directory.writeUInt16LE(images.length, 4);

let offset = directory.length;
for (let index = 0; index < images.length; index += 1) {
  const entry = 6 + index * 16;
  directory.writeUInt8(sizes[index], entry);
  directory.writeUInt8(sizes[index], entry + 1);
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(images[index].length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += images[index].length;
}

await writeFile(new URL("../app/favicon.ico", import.meta.url), Buffer.concat([directory, ...images]));
