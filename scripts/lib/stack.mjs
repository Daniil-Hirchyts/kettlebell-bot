// Stack critique filmstrips into one reviewable image.
import { readFileSync, writeFileSync } from "node:fs";
import { blank, decodePng, drawText, encodePng, paste } from "./png.mjs";

export function stackStrips(files, outPath, { labelHeight = 22, gap = 6 } = {}) {
  const imgs = files.map(([label, path]) => ({ label, img: decodePng(readFileSync(path)) }));
  const width = Math.max(...imgs.map((i) => i.img.width));
  const height = imgs.reduce((n, i) => n + i.img.height + labelHeight + gap, gap);
  const sheet = blank(width, height, [246, 247, 249, 255]);
  let y = gap;
  for (const { label, img } of imgs) {
    drawText(sheet, label, 6, y + 4, { scale: 2, color: [40, 44, 52, 255] });
    paste(sheet, img, 0, y + labelHeight);
    y += img.height + labelHeight + gap;
  }
  writeFileSync(outPath, encodePng(sheet));
  return outPath;
}
