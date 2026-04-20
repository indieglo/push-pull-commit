import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const source = resolve(root, 'public/icons/icon.svg');

const targets = [
  { size: 192, out: resolve(root, 'public/icons/icon-192.png') },
  { size: 512, out: resolve(root, 'public/icons/icon-512.png') },
];

const svg = await readFile(source);
for (const { size, out } of targets) {
  await sharp(svg, { density: 400 })
    .resize(size, size)
    .png()
    .toFile(out);
  console.log(`wrote ${out}`);
}
