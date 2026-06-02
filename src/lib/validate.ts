// Request-body validation for layout-item and overlay mutations.

import {
  DEFAULT_GIFT_SCALE,
  DEFAULT_TEXT_SCALE,
  DEFAULT_TICKER_SCALE,
  DEFAULT_TICKER_SPEED,
  MAX_TICKER_ENTRIES,
  type ItemInput,
  type ItemType,
  type TickerEntry,
} from "./types";

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function str(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
}

function color(v: unknown): string | undefined {
  return typeof v === "string" && HEX.test(v.trim()) ? v.trim().toLowerCase() : undefined;
}

function num(v: unknown, min: number, max: number, dflt: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
}

/** Allow a same-origin path (/gifts/…) or an absolute http(s) URL. */
function assetUrl(v: unknown): string | undefined {
  const s = str(v, 2000);
  if (!s) return undefined;
  if (s.startsWith("/")) return s;
  try {
    const u = new URL(s);
    if (u.protocol === "http:" || u.protocol === "https:") return s;
  } catch {
    /* not a URL */
  }
  return undefined;
}

const ITEM_TYPES: ItemType[] = ["gift", "text", "ticker"];
const asItemType = (v: unknown): ItemType =>
  ITEM_TYPES.includes(v as ItemType) ? (v as ItemType) : "gift";

function parseEntries(v: unknown): TickerEntry[] {
  if (!Array.isArray(v)) return [];
  const out: TickerEntry[] = [];
  for (const raw of v.slice(0, MAX_TICKER_ENTRIES)) {
    if (!raw || typeof raw !== "object") continue;
    const e = raw as Record<string, unknown>;
    const name = str(e.name, 80);
    const emoji = str(e.emoji, 16);
    const imageUrl = assetUrl(e.imageUrl);
    const caption = str(e.caption, 120);
    if (!name && !emoji && !imageUrl && !caption) continue;
    out.push({ id: str(e.id, 40) ?? `e${out.length}`, giftId: str(e.giftId, 80), name, emoji, imageUrl, caption });
  }
  return out;
}

function scaleDefault(type: ItemType): number {
  if (type === "text") return DEFAULT_TEXT_SCALE;
  if (type === "ticker") return DEFAULT_TICKER_SCALE;
  return DEFAULT_GIFT_SCALE;
}

/** Parse a full item to place (POST). */
export function parseItemInput(body: unknown): ItemInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const type = asItemType(b.type);
  const base = {
    type,
    x: num(b.x, 0, 100, 50),
    y: num(b.y, 0, 100, 50),
    scale: num(b.scale, 1, 100, scaleDefault(type)),
    rotation: num(b.rotation, -180, 180, 0),
  };

  if (type === "ticker") {
    return { ...base, entries: parseEntries(b.entries), speed: num(b.speed, 3, 60, DEFAULT_TICKER_SPEED) };
  }

  if (type === "gift") {
    const name = str(b.name, 80);
    const emoji = str(b.emoji, 16);
    const imageUrl = assetUrl(b.imageUrl);
    if (!name && !emoji && !imageUrl) return null; // nothing to render
    return { ...base, giftId: str(b.giftId, 80), name, emoji, imageUrl };
  }

  const text = str(b.text, 120);
  if (!text) return null;
  return { ...base, text, color: color(b.color) ?? "#ffffff" };
}

/** Parse a partial item update (PATCH). Only present keys are returned. */
export function parseItemPatch(body: unknown): Partial<ItemInput> | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const patch: Partial<ItemInput> = {};
  if ("x" in b) patch.x = num(b.x, 0, 100, 50);
  if ("y" in b) patch.y = num(b.y, 0, 100, 50);
  if ("scale" in b) patch.scale = num(b.scale, 1, 100, 18);
  if ("rotation" in b) patch.rotation = num(b.rotation, -180, 180, 0);
  if ("text" in b) patch.text = str(b.text, 120);
  if ("color" in b) patch.color = color(b.color) ?? "#ffffff";
  if ("name" in b) patch.name = str(b.name, 80);
  if ("emoji" in b) patch.emoji = str(b.emoji, 16);
  if ("imageUrl" in b) patch.imageUrl = assetUrl(b.imageUrl);
  if ("entries" in b) patch.entries = parseEntries(b.entries);
  if ("speed" in b) patch.speed = num(b.speed, 3, 60, DEFAULT_TICKER_SPEED);
  return patch;
}

/** Parse an overlay-level patch (name + background). */
export function parseOverlayPatch(body: unknown): { name?: string; config?: { background?: string } } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const out: { name?: string; config?: { background?: string } } = {};
  if ("name" in b) out.name = str(b.name, 120) ?? "Untitled";
  if (b.config && typeof b.config === "object") {
    const c = b.config as Record<string, unknown>;
    if ("background" in c) {
      const bg = c.background === "transparent" ? "transparent" : color(c.background);
      if (bg) out.config = { background: bg };
    }
  }
  return out;
}
