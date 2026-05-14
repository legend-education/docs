#!/usr/bin/env node
/**
 * Generate images/us-states.svg from us-atlas's pre-projected Albers
 * USA topology. The output SVG has one <path> per state with:
 *   id="US-{postal}"
 *   data-state="{full name}"
 *   role="button" tabindex="0" aria-label="{full name}"
 *
 * No npm deps — inline TopoJSON arc decoder (~30 lines).
 *
 * Run from the repo root:
 *   node scripts/generate-state-map.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), "..");

const TOPOJSON_URL =
  "https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json";

const STATES = {
  "01": { postal: "AL", name: "Alabama" },
  "02": { postal: "AK", name: "Alaska" },
  "04": { postal: "AZ", name: "Arizona" },
  "05": { postal: "AR", name: "Arkansas" },
  "06": { postal: "CA", name: "California" },
  "08": { postal: "CO", name: "Colorado" },
  "09": { postal: "CT", name: "Connecticut" },
  "10": { postal: "DE", name: "Delaware" },
  "11": { postal: "DC", name: "District of Columbia" },
  "12": { postal: "FL", name: "Florida" },
  "13": { postal: "GA", name: "Georgia" },
  "15": { postal: "HI", name: "Hawaii" },
  "16": { postal: "ID", name: "Idaho" },
  "17": { postal: "IL", name: "Illinois" },
  "18": { postal: "IN", name: "Indiana" },
  "19": { postal: "IA", name: "Iowa" },
  "20": { postal: "KS", name: "Kansas" },
  "21": { postal: "KY", name: "Kentucky" },
  "22": { postal: "LA", name: "Louisiana" },
  "23": { postal: "ME", name: "Maine" },
  "24": { postal: "MD", name: "Maryland" },
  "25": { postal: "MA", name: "Massachusetts" },
  "26": { postal: "MI", name: "Michigan" },
  "27": { postal: "MN", name: "Minnesota" },
  "28": { postal: "MS", name: "Mississippi" },
  "29": { postal: "MO", name: "Missouri" },
  "30": { postal: "MT", name: "Montana" },
  "31": { postal: "NE", name: "Nebraska" },
  "32": { postal: "NV", name: "Nevada" },
  "33": { postal: "NH", name: "New Hampshire" },
  "34": { postal: "NJ", name: "New Jersey" },
  "35": { postal: "NM", name: "New Mexico" },
  "36": { postal: "NY", name: "New York" },
  "37": { postal: "NC", name: "North Carolina" },
  "38": { postal: "ND", name: "North Dakota" },
  "39": { postal: "OH", name: "Ohio" },
  "40": { postal: "OK", name: "Oklahoma" },
  "41": { postal: "OR", name: "Oregon" },
  "42": { postal: "PA", name: "Pennsylvania" },
  "44": { postal: "RI", name: "Rhode Island" },
  "45": { postal: "SC", name: "South Carolina" },
  "46": { postal: "SD", name: "South Dakota" },
  "47": { postal: "TN", name: "Tennessee" },
  "48": { postal: "TX", name: "Texas" },
  "49": { postal: "UT", name: "Utah" },
  "50": { postal: "VT", name: "Vermont" },
  "51": { postal: "VA", name: "Virginia" },
  "53": { postal: "WA", name: "Washington" },
  "54": { postal: "WV", name: "West Virginia" },
  "55": { postal: "WI", name: "Wisconsin" },
  "56": { postal: "WY", name: "Wyoming" },
};

// TopoJSON arc decoder. Each position in an arc is a delta from the
// previous position; the first position is a delta from (0, 0). The
// `transform` then scales + translates to absolute pixel space.
function decodeArc(arc, { scale, translate }) {
  let x = 0;
  let y = 0;
  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
  });
}

function ringToPoints(ringArcs, arcsCache) {
  const points = [];
  for (const idx of ringArcs) {
    const reverse = idx < 0;
    const i = reverse ? ~idx : idx;
    const arc = reverse ? arcsCache[i].slice().reverse() : arcsCache[i];
    if (points.length === 0) {
      points.push(...arc);
    } else {
      // Skip the first point — it duplicates the last point of the previous arc.
      points.push(...arc.slice(1));
    }
  }
  return points;
}

function ringToPath(ringArcs, arcsCache) {
  const pts = ringToPoints(ringArcs, arcsCache);
  if (pts.length === 0) return "";
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    d += `L${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)}`;
  }
  return d + "Z";
}

function geometryToPath(geom, arcsCache) {
  if (geom.type === "Polygon") {
    return geom.arcs.map((ring) => ringToPath(ring, arcsCache)).join("");
  }
  if (geom.type === "MultiPolygon") {
    return geom.arcs
      .flatMap((polygon) => polygon.map((ring) => ringToPath(ring, arcsCache)))
      .join("");
  }
  throw new Error("Unsupported geometry type: " + geom.type);
}

function bboxCenter(geom, arcsCache) {
  const rings = geom.type === "Polygon" ? geom.arcs : geom.arcs.flat();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ringArcs of rings) {
    for (const [x, y] of ringToPoints(ringArcs, arcsCache)) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

async function main() {
  console.log(`Fetching ${TOPOJSON_URL}…`);
  const res = await fetch(TOPOJSON_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const topology = await res.json();
  const transform = topology.transform;
  const arcsCache = topology.arcs.map((a) => decodeArc(a, transform));

  const stateObj = topology.objects.states;
  if (!stateObj) throw new Error("topology.objects.states missing");

  const found = new Set();
  const paths = [];
  let dcCenter = null;
  for (const geom of stateObj.geometries) {
    const fips = String(geom.id).padStart(2, "0");
    const info = STATES[fips];
    if (!info) {
      console.warn(`Skipping unknown FIPS ${fips}`);
      continue;
    }
    found.add(fips);

    // DC at 10m Albers is only ~4px wide — too small to click reliably.
    // Replace it with a circle marker at its centroid so the same row in
    // the standards table is reachable via the map. The circle is added
    // to a separate list and rendered after states so it sits on top.
    if (info.postal === "DC") {
      dcCenter = bboxCenter(geom, arcsCache);
      continue;
    }

    const d = geometryToPath(geom, arcsCache);
    paths.push({
      name: info.name,
      postal: info.postal,
      d,
    });
  }

  const missing = Object.keys(STATES).filter((k) => !found.has(k));
  if (missing.length > 0) {
    console.warn(
      "Missing from topology: " +
        missing.map((k) => `${k} (${STATES[k].name})`).join(", ")
    );
  }

  paths.sort((a, b) => a.name.localeCompare(b.name));

  const [minX, minY, maxX, maxY] = topology.bbox || [0, 0, 975, 610];
  const vbW = Math.round(maxX - minX);
  const vbH = Math.round(maxY - minY);

  const stateMarkup = paths
    .map(
      (p) =>
        `  <path id="US-${p.postal}" data-state="${p.name}" role="button" tabindex="0" aria-label="${p.name}" d="${p.d}"/>`
    )
    .join("\n");

  let dcMarkup = "";
  if (dcCenter) {
    const [cx, cy] = dcCenter;
    dcMarkup =
      `\n  <circle id="US-DC" data-state="District of Columbia" role="button" tabindex="0" aria-label="District of Columbia" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5"/>`;
  }

  // No aria-hidden on the <svg>: every state <path> exposes role="button"
  // + aria-label, so individual states must remain in the accessibility
  // tree for keyboard / screen-reader users to navigate them.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${Math.round(minX)} ${Math.round(minY)} ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet" role="group" aria-label="U.S. states map">
${stateMarkup}${dcMarkup}
</svg>
`;

  const out = path.join(root, "images/us-states.svg");
  await fs.writeFile(out, svg);
  console.log(`Wrote ${paths.length} states to ${out} (${(svg.length / 1024).toFixed(1)} KB)`);

  // Mintlify hosts assets behind signed mintcdn.com URLs and does not serve
  // raw files (e.g. /images/us-states.svg) on the deployed origin, so a
  // runtime fetch from scripts.js 404s in production. Emit the same SVG as
  // a JS module that registers it on `window`, then load that file via
  // `customScripts` (which Mintlify *does* run) so scripts.js can read the
  // markup without a network round-trip.
  const jsOut = path.join(root, "state-map-svg.js");
  const jsLiteral = JSON.stringify(svg);
  const jsSource = `// Auto-generated by scripts/generate-state-map.mjs. Do not edit by hand.
// Loaded as a customScript so scripts.js can inject the U.S. states map
// without fetching /images/us-states.svg (which 404s on Mintlify's CDN).
window.__LEGEND_STATE_MAP_SVG__ = ${jsLiteral};
`;
  await fs.writeFile(jsOut, jsSource);
  console.log(`Wrote ${jsOut} (${(jsSource.length / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
