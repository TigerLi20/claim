import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const icon = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg"><rect width="1024" height="1024" fill="#3d3129"/><text x="500" y="651" text-anchor="middle" fill="#fff" font-family="Arial,Helvetica,sans-serif" font-size="420" font-weight="800" letter-spacing="-22">CH</text><circle cx="825" cy="220" r="78" fill="#80b5d4"/></svg>`;
const foreground = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg"><text x="500" y="640" text-anchor="middle" fill="#fff" font-family="Arial,Helvetica,sans-serif" font-size="390" font-weight="800" letter-spacing="-22">CH</text><circle cx="800" cy="240" r="70" fill="#80b5d4"/></svg>`;
const push = `<svg width="96" height="96" xmlns="http://www.w3.org/2000/svg"><text x="47" y="65" text-anchor="middle" fill="#fff" font-family="Arial,Helvetica,sans-serif" font-size="43" font-weight="800">CH</text></svg>`;
async function write(svg, size, file) { fs.mkdirSync(path.dirname(file), { recursive: true }); await sharp(Buffer.from(svg)).resize(size, size).png().toFile(file); }
function splashSvg(width, height) {
  const side = Math.min(width, height);
  const icon = Math.round(side * 0.14);
  const iconX = Math.round((width - icon) / 2);
  const iconY = Math.round(height / 2 - icon * 0.8);
  const titleY = Math.round(iconY + icon * 1.5);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#f8f7f4"/>
    <rect x="${iconX}" y="${iconY}" width="${icon}" height="${icon}" rx="${Math.round(icon * 0.23)}" fill="#3d3129"/>
    <text x="${Math.round(width / 2 - icon * 0.02)}" y="${Math.round(iconY + icon * 0.68)}" text-anchor="middle" fill="#fff" font-family="Arial,Helvetica,sans-serif" font-size="${Math.round(icon * 0.43)}" font-weight="800" letter-spacing="${Math.round(-icon * 0.025)}">CH</text>
    <circle cx="${Math.round(iconX + icon * 0.81)}" cy="${Math.round(iconY + icon * 0.2)}" r="${Math.round(icon * 0.08)}" fill="#80b5d4"/>
    <text x="${Math.round(width / 2)}" y="${titleY}" text-anchor="middle" fill="#3d3129" font-family="Arial,Helvetica,sans-serif" font-size="${Math.round(side * 0.045)}" font-weight="700">College Hill Market</text>
  </svg>`;
}
async function replaceSplash(file) {
  const { width, height } = await sharp(file).metadata();
  const image = await sharp(Buffer.from(splashSvg(width, height))).png().toBuffer();
  fs.writeFileSync(file, image);
}
await write(icon, 1024, path.join(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"));
for (const [density, size] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
  const dir = path.join(root, `android/app/src/main/res/mipmap-${density}`);
  await write(icon, size, path.join(dir, "ic_launcher.png"));
  await write(icon, size, path.join(dir, "ic_launcher_round.png"));
  await write(foreground, size * 2, path.join(dir, "ic_launcher_foreground.png"));
  await write(push, size, path.join(dir, "ic_push.png"));
}
const iosSplash = path.join(root, "ios/App/App/Assets.xcassets/Splash.imageset");
for (const file of fs.readdirSync(iosSplash).filter(name => name.endsWith(".png"))) await replaceSplash(path.join(iosSplash, file));
const androidRes = path.join(root, "android/app/src/main/res");
for (const dir of fs.readdirSync(androidRes).filter(name => name.startsWith("drawable"))) {
  const file = path.join(androidRes, dir, "splash.png");
  if (fs.existsSync(file)) await replaceSplash(file);
}
