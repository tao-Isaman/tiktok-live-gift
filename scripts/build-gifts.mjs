// Download REAL TikTok gift images into /public/gifts and write the manifest
// src/lib/gift-images.json ({ "<giftId>": "/gifts/<id>.webp" }). The app
// auto-uses a bundled image when its id is in the manifest, else the emoji.
//
// Source: https://streamtoearn.io/gifts — a public catalog whose <img> tags
// point at TikTok's UNSIGNED webcast CDN (p16-webcast.tiktokcdn.com/img/…webp),
// so we can fetch the page, match gifts by name to our curated ids, and
// download same-origin copies (CDN URLs are hotlink/expiry-unsafe in OBS).
//
// Usage:
//   npm run gifts:build            # default catalog
//   npm run gifts:build -- US      # a specific region (streamtoearn ?region=)
//
// ⚠️ Gift artwork is TikTok / ByteDance IP. This tool is unofficial; you are
// responsible for how you use the downloaded assets.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const region = process.argv[2];
const pageUrl = `https://streamtoearn.io/gifts${region ? `?region=${encodeURIComponent(region)}` : ""}`;

const slug = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Our curated ids, extracted from src/lib/gifts.ts (only bundle gifts the
// picker actually shows).
const giftsTs = await readFile("src/lib/gifts.ts", "utf8");
const ourIds = new Set([...giftsTs.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]));

console.log(`Fetching ${pageUrl} …`);
const html = await fetch(pageUrl, { headers: { "user-agent": "Mozilla/5.0" } }).then((r) => r.text());

// Each gift is <img … src="…tiktokcdn…webp" … alt="<Name> TikTok gift">.
const re = /<img\b[^>]*?src="([^"]+tiktokcdn[^"]+)"[^>]*?alt="([^"]+?)"/g;
const byId = new Map();
for (const m of html.matchAll(re)) {
  const url = m[1];
  const name = m[2].replace(/\s*TikTok gift\s*$/i, "").trim();
  const id = slug(name);
  if (ourIds.has(id) && !byId.has(id)) byId.set(id, url);
}
console.log(`Matched ${byId.size}/${ourIds.size} curated gifts on the page.`);

await mkdir("public/gifts", { recursive: true });
const manifest = {};
let saved = 0;

for (const [id, url] of byId) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0", referer: "https://streamtoearn.io/" },
    });
    if (!res.ok) {
      console.warn(`  ${id}: HTTP ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(path.join("public/gifts", `${id}.webp`), buf);
    manifest[id] = `/gifts/${id}.webp`;
    saved++;
  } catch (err) {
    console.warn(`  ${id}: ${err?.message || err}`);
  }
}

// Sort keys for a stable diff.
const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
await writeFile("src/lib/gift-images.json", JSON.stringify(sorted, null, 2) + "\n");

console.log(`Saved ${saved} gift images → public/gifts, wrote src/lib/gift-images.json`);
const missing = [...ourIds].filter((id) => !manifest[id]);
if (missing.length) console.log(`No image for: ${missing.join(", ")} (kept emoji fallback).`);
