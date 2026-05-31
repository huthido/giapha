// One-off: rasterize the branded app icon (amber square + white "git-branch"
// glyph, matching the Sidebar/Login logo) into the PNGs the PWA manifest needs.
// Run with: node scripts/gen-icons.mjs   (sharp is a dev-only dependency)
import sharp from 'sharp';
import { mkdirSync } from 'fs';

const BRANCH = `
  <g fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="6" x2="6" y1="3" y2="15"/>
    <circle cx="18" cy="6" r="3"/>
    <circle cx="6" cy="18" r="3"/>
    <path d="M18 9a9 9 0 0 1-9 9"/>
  </g>`;

// `any` icon: rounded amber square, glyph at ~50%.
const rounded = (s) => Buffer.from(`
<svg width="${s}" height="${s}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="#f59e0b"/>
  <g transform="translate(128 128) scale(10.67)">${BRANCH}</g>
</svg>`);

// maskable icon: full-bleed amber, glyph kept inside the ~80% safe zone.
const maskable = (s) => Buffer.from(`
<svg width="${s}" height="${s}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#f59e0b"/>
  <g transform="translate(154 154) scale(8.5)">${BRANCH}</g>
</svg>`);

mkdirSync('public/icons', { recursive: true });

const jobs = [
  ['public/icons/icon-192.png', rounded(192)],
  ['public/icons/icon-512.png', rounded(512)],
  ['public/icons/maskable-512.png', maskable(512)],
  ['public/icons/apple-touch-icon.png', maskable(180)],
];

for (const [out, svg] of jobs) {
  await sharp(svg).png().toFile(out);
  console.log('wrote', out);
}
