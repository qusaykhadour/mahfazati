// يولّد كل أيقونات التطبيق من رسمة SVG واحدة باستخدام sharp
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const BG_A = '#0B6B63';
const BG_B = '#16B89C';

const art = (mono = false) => {
  const ink = mono ? '#ffffff' : '#0F766E';
  const flap = mono ? '#ffffff' : '#0B6B63';
  const body = mono ? '#ffffff' : '#0F766E';
  const gold = mono ? '#ffffff' : '#F6B53F';
  const op = (v) => (mono ? 1 : v);
  return `
  <ellipse cx="512" cy="648" rx="240" ry="30" fill="${flap}" fill-opacity="${op(0.10)}"/>
  <rect x="322" y="436" width="380" height="236" rx="52" fill="${body}"/>
  <path d="M322 546 L322 488 A52 52 0 0 1 374 436 L650 436 A52 52 0 0 1 702 488 L702 546 Z" fill="${flap}" fill-opacity="${op(0.55)}"/>
  <rect x="322" y="536" width="380" height="10" fill="#ffffff" fill-opacity="${op(0.35)}"/>
  <circle cx="648" cy="554" r="50" fill="${gold}"/>
  <circle cx="648" cy="554" r="28" fill="${mono ? flap : '#ffffff'}"/>
  <circle cx="648" cy="554" r="13" fill="${gold}"/>
  <rect x="368" y="580" width="150" height="18" rx="9" fill="#ffffff" fill-opacity="${op(0.45)}"/>
`;
};

const iconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BG_A}"/>
      <stop offset="0.55" stop-color="#0E8C80"/>
      <stop offset="1" stop-color="${BG_B}"/>
    </linearGradient>
    <radialGradient id="glow" cx="18%" cy="10%" r="85%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.30"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="medal" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.8" stop-color="#F4FBF9"/>
      <stop offset="1" stop-color="#DCEFEA"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <circle cx="964" cy="1014" r="310" fill="#ffffff" fill-opacity="0.06"/>
  <rect width="1024" height="1024" fill="url(#glow)"/>
  <circle cx="512" cy="512" r="404" fill="url(#medal)"/>
  <circle cx="512" cy="512" r="404" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="10"/>
  <circle cx="512" cy="512" r="358" fill="none" stroke="${BG_A}" stroke-opacity="0.14" stroke-width="6"/>
  <g transform="translate(512 512) scale(1.02) translate(-512 -512)">${art(false)}</g>
</svg>`;

const centered = (inner, scale) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">${inner}</g>
</svg>`;

const foregroundSvg = centered(art(false), 1);
const monoSvg = centered(art(true), 0.95);
const splashSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 1024 1024">
  <g transform="translate(512 512) scale(0.92) translate(-512 -512)">${art(false)}</g>
</svg>`;

const backgroundSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BG_A}"/>
      <stop offset="1" stop-color="${BG_B}"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
</svg>`;

async function render(svg, size, out) {
  await sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
  console.log('✓', out, `${size}px`);
}

await mkdir('assets/brand', { recursive: true });
await writeFile('assets/brand/icon.svg', iconSvg);

await render(iconSvg, 1024, 'assets/icon.png');
await render(foregroundSvg, 1024, 'assets/android-icon-foreground.png');
await render(backgroundSvg, 1024, 'assets/android-icon-background.png');
await render(monoSvg, 1024, 'assets/android-icon-monochrome.png');
await render(splashSvg, 512, 'assets/splash-icon.png');
await render(iconSvg, 64, 'assets/favicon.png');

// معاينة سريعة للمراجعة البصرية (داخل المشروع)
await sharp(Buffer.from(iconSvg)).resize(360, 360).png().toFile('assets/brand/preview-icon.png');
await sharp(Buffer.from(splashSvg))
  .resize(260, 260)
  .flatten({ background: BG_A })
  .png()
  .toFile('assets/brand/preview-splash.png');
console.log('previews ready in assets/brand/');
