// Core domain types for the custom layout builder.
//
// A layout (kept as `Overlay` for route compatibility) holds freely-positioned
// items — TikTok gift images and text — that the streamer arranges on a portrait
// canvas. Positions are PERCENTAGES of the stage so the same layout renders
// identically at any browser-source resolution. `rev` is bumped on every change
// and drives the live SSE sync to the overlay.

export type ItemType = "gift" | "text" | "ticker";

/** One gift entry inside a running-gifts ticker, with its own caption. */
export interface TickerEntry {
  id: string;
  giftId?: string;
  name?: string;
  emoji?: string;
  imageUrl?: string;
  /** Custom text shown below the gift. */
  caption?: string;
}

export interface OverlayItem {
  id: string;
  type: ItemType;
  /** Center position, percentage of the stage (0–100). */
  x: number;
  y: number;
  /** Size as a percentage of the stage WIDTH (rendered via container-query units). */
  scale: number;
  /** Rotation in degrees (-180…180). */
  rotation: number;

  // --- gift ---
  giftId?: string;
  /** Gift name (used as a label / alt text). */
  name?: string;
  /** Emoji fallback shown when no bundled image exists. */
  emoji?: string;
  /** Same-origin bundled gift image (e.g. /gifts/rose.webp), if available. */
  imageUrl?: string;

  // --- text ---
  text?: string;
  color?: string;

  // --- ticker (running gifts) ---
  /** Gifts shown in the scrolling band, each with its own caption. */
  entries?: TickerEntry[];
  /** Seconds for one full scroll loop (lower = faster). */
  speed?: number;
}

export type ItemInput = Omit<OverlayItem, "id">;

export interface OverlayConfig {
  /** Stage background: "transparent" (for OBS) or a hex color (for designing). */
  background: string;
}

export interface Overlay {
  id: string;
  name: string;
  config: OverlayConfig;
  items: OverlayItem[];
  /** Monotonic version, incremented on every change. Drives live sync. */
  rev: number;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_CONFIG: OverlayConfig = { background: "transparent" };

/** Backstop against unbounded growth. */
export const MAX_ITEMS = 60;

/** Default size (in stage-width %) for a newly placed item. */
export const DEFAULT_GIFT_SCALE = 18;
export const DEFAULT_TEXT_SCALE = 9;
/** Gift height (stage-width %) inside a ticker, and default scroll speed (s). */
export const DEFAULT_TICKER_SCALE = 16;
export const DEFAULT_TICKER_SPEED = 18;
/** Max gifts in one ticker. */
export const MAX_TICKER_ENTRIES = 30;
