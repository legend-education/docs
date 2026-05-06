#!/usr/bin/env node
/**
 * Generate logo/light.svg and logo/dark.svg from the Legend wordmark
 * defined in mono/apps/v2-product/components/marketing/header/_svg/icon.tsx.
 *
 * The source uses var(--color-icon-loud); we hardcode concrete colors for
 * each Mintlify variant:
 *   - light.svg → dark fill (#1e1c1a) for use on light backgrounds
 *   - dark.svg  → cream fill (#f4ede8) for use on dark backgrounds
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), "..");
const sourceTsx = path.resolve(
  root,
  "..",
  "mono",
  "apps",
  "v2-product",
  "components",
  "marketing",
  "header",
  "_svg",
  "icon.tsx",
);

const tsx = await fs.readFile(sourceTsx, "utf8");

// Pull every `d="..."` path out of the TSX source.
const ds = [...tsx.matchAll(/d="([^"]+)"/g)].map((m) => m[1]);
if (ds.length === 0) throw new Error("no path data found in source TSX");

function buildSvg(fill) {
  const paths = ds
    .map((d) => `  <path fill="${fill}" d="${d}"/>`)
    .join("\n");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="38" viewBox="0 0 72 38" fill="none" role="img" aria-label="Legend">`,
    paths,
    `</svg>`,
    "",
  ].join("\n");
}

await fs.writeFile(path.join(root, "logo/light.svg"), buildSvg("#1e1c1a"), "utf8");
await fs.writeFile(path.join(root, "logo/dark.svg"), buildSvg("#f4ede8"), "utf8");

console.log(`wrote logo/light.svg + logo/dark.svg (${ds.length} paths)`);
