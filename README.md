# TikTok Gift Live — Custom Gift Layout

Design a **custom layout** of TikTok gift images and show it on your **TikTok Live** via a single
overlay URL. Pick gifts, drag/resize/rotate them on a portrait canvas, and the layout updates **live
on stream** — no refresh.

Built with **Next.js (App Router) + TypeScript**, deployable on **Vercel**.

---

## Elements

- **Gift** — a TikTok gift image (or emoji), freely placed/sized/rotated.
- **Text** — a custom caption with color.
- **Running gifts (ticker)** — a full-width band of multiple gifts, each with its own caption,
  scrolling across the screen as a marquee (adjustable speed). Drag it to set its vertical position.

## How it works

Two surfaces sharing a server-side store:

| Surface | Route | Who opens it |
| --- | --- | --- |
| **Editor** | `/dashboard/[id]` | You — place & arrange gifts on the canvas |
| **Overlay** | `/overlay/[id]` | TikTok LIVE Studio / OBS — renders the layout, transparent background |

The server is the single source of truth. The editor writes via a small REST API; the overlay opens
a **Server-Sent Events** stream and re-renders whenever the layout's version (`rev`) changes.
Positions are stored as **percentages** and sizes use **container-query units**, so the layout looks
identical in the small editor canvas and at full 1080×1920 in OBS.

## Adding the overlay to your stream

Create a layout, copy the **Overlay URL**, then:

- **TikTok LIVE Studio (Windows):** Scene editor → **+ Add Source** → **Link** → paste the URL.
- **OBS Studio:** Sources → **+** → **Browser** → paste the URL, set size **1080 × 1920** (portrait).

## Gift images

The gift picker is data-driven from `src/lib/gifts.ts` (a curated ~50 popular gifts across all price
tiers). Each gift renders as a **bundled same-origin image** when one exists, otherwise an **emoji
fallback** — so the app works out of the box.

**Real gift images are bundled** (38 of the ~46 curated gifts). They were downloaded by:

```bash
npm run gifts:build          # default catalog
npm run gifts:build -- US    # a specific region
```

This scrapes the public catalog at **streamtoearn.io/gifts** — whose `<img>` tags point at TikTok's
**unsigned** webcast CDN — matches gifts to our ids by name, and saves same-origin copies to
`public/gifts/<id>.webp`, writing `src/lib/gift-images.json`. We **self-host** on purpose: TikTok's
signed CDN URLs expire and are hotlink-protected, so they'd break inside OBS. Gifts that don't
name-match keep their emoji fallback.

> ⚠️ Gift names and artwork are property of **TikTok / ByteDance**. This tool is **unofficial and not
> endorsed** by TikTok; you are responsible for how you use the downloaded assets.

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

## Storage

Zero-config **in-memory** by default (resets on restart). Set Upstash Redis / Vercel KV env vars and
the store switches automatically (durable, multi-instance) — see `.env.example`:

```
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

## Project layout

```
src/
  app/
    page.tsx                      landing (create / resume)
    dashboard/[id]/               editor (server page + canvas editor)
    overlay/[id]/                 live overlay (server page + SSE client)
    api/overlays/...              REST + SSE route handlers
  components/GiftPicker.tsx       gift catalog picker
  lib/
    types.ts                      domain types
    gifts.ts                      curated gift catalog
    gift-images.json              id → bundled image path (filled by gifts:build)
    store.ts                      storage abstraction (memory + Redis), rev counter
    validate.ts                   request-body sanitization
    client.ts                     editor fetch helpers
scripts/build-gifts.mjs           one-time real-image downloader
```
