// Storage abstraction for layouts (kept as `Overlay`).
//
// The server is the single source of truth — the editor writes, the overlay
// reads, and both see the same state. Two backends:
//
//   • MemoryStore — default, zero-config (pinned to globalThis to survive HMR).
//   • RedisStore  — used automatically when Upstash/Vercel-KV env vars are set;
//     survives restarts and is shared across serverless instances.
//
// Every mutation bumps `rev`; the SSE stream polls `getRev()` to push updates.

import { customAlphabet } from "nanoid";
import {
  DEFAULT_CONFIG,
  MAX_ITEMS,
  type ItemInput,
  type Overlay,
  type OverlayConfig,
  type OverlayItem,
} from "./types";

const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);
export const newOverlayId = () => nano();
const newItemId = () => nano();

function touch(o: Overlay): Overlay {
  o.rev += 1;
  o.updatedAt = Date.now();
  return o;
}

function makeOverlay(): Overlay {
  const now = Date.now();
  return {
    id: newOverlayId(),
    name: "My Layout",
    config: { ...DEFAULT_CONFIG },
    items: [],
    rev: 1,
    createdAt: now,
    updatedAt: now,
  };
}

const clamp = (v: unknown, min: number, max: number, dflt: number) => {
  const n = typeof v === "number" && Number.isFinite(v) ? v : dflt;
  return Math.min(max, Math.max(min, n));
};

function applyItem(item: OverlayItem, input: Partial<ItemInput>): OverlayItem {
  const m = { ...item, ...input };
  return {
    ...m,
    x: clamp(m.x, 0, 100, 50),
    y: clamp(m.y, 0, 100, 50),
    scale: clamp(m.scale, 1, 100, 18),
    rotation: clamp(m.rotation, -180, 180, 0),
    ...(m.speed !== undefined ? { speed: clamp(m.speed, 3, 60, 18) } : {}),
  };
}

export interface OverlayPatch {
  name?: string;
  config?: Partial<OverlayConfig>;
}

export interface Store {
  create(): Promise<Overlay>;
  get(id: string): Promise<Overlay | null>;
  /** Cheap version read used by the SSE poll loop. */
  getRev(id: string): Promise<number | null>;
  addItem(id: string, input: ItemInput): Promise<Overlay | null>;
  updateItem(id: string, itemId: string, patch: Partial<ItemInput>): Promise<Overlay | null>;
  deleteItem(id: string, itemId: string): Promise<Overlay | null>;
  /** Reorder items (= z-order) to match `orderedIds`. */
  reorder(id: string, orderedIds: string[]): Promise<Overlay | null>;
  clearItems(id: string): Promise<Overlay | null>;
  updateOverlay(id: string, patch: OverlayPatch): Promise<Overlay | null>;
}

function reorderItems(items: OverlayItem[], orderedIds: string[]): OverlayItem[] {
  const byId = new Map(items.map((it) => [it.id, it]));
  const out: OverlayItem[] = [];
  for (const id of orderedIds) {
    const it = byId.get(id);
    if (it) {
      out.push(it);
      byId.delete(id);
    }
  }
  for (const it of items) if (byId.has(it.id)) out.push(it);
  return out;
}

function pushItem(o: Overlay, input: ItemInput) {
  if (o.items.length >= MAX_ITEMS) return;
  o.items.push(applyItem({ id: newItemId() } as OverlayItem, input));
}

// --- In-memory backend -------------------------------------------------------

class MemoryStore implements Store {
  private db: Map<string, Overlay>;

  constructor() {
    const g = globalThis as unknown as { __tglDB?: Map<string, Overlay> };
    this.db = g.__tglDB ?? (g.__tglDB = new Map());
  }

  async create() {
    const o = makeOverlay();
    this.db.set(o.id, o);
    return structuredClone(o);
  }

  async get(id: string) {
    const o = this.db.get(id);
    return o ? structuredClone(o) : null;
  }

  async getRev(id: string) {
    return this.db.get(id)?.rev ?? null;
  }

  private mutate(id: string, fn: (o: Overlay) => void): Overlay | null {
    const o = this.db.get(id);
    if (!o) return null;
    fn(o);
    touch(o);
    return structuredClone(o);
  }

  async addItem(id: string, input: ItemInput) {
    return this.mutate(id, (o) => pushItem(o, input));
  }

  async updateItem(id: string, itemId: string, patch: Partial<ItemInput>) {
    return this.mutate(id, (o) => {
      const idx = o.items.findIndex((it) => it.id === itemId);
      if (idx >= 0) o.items[idx] = applyItem(o.items[idx], patch);
    });
  }

  async deleteItem(id: string, itemId: string) {
    return this.mutate(id, (o) => {
      o.items = o.items.filter((it) => it.id !== itemId);
    });
  }

  async reorder(id: string, orderedIds: string[]) {
    return this.mutate(id, (o) => {
      o.items = reorderItems(o.items, orderedIds);
    });
  }

  async clearItems(id: string) {
    return this.mutate(id, (o) => {
      o.items = [];
    });
  }

  async updateOverlay(id: string, patch: OverlayPatch) {
    return this.mutate(id, (o) => {
      if (patch.name !== undefined) o.name = patch.name;
      if (patch.config) o.config = { ...o.config, ...patch.config };
    });
  }
}

// --- Redis (Upstash / Vercel KV) backend ------------------------------------

type RedisClient = {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
};

class RedisStore implements Store {
  constructor(private redis: RedisClient) {}

  private key(id: string) {
    return `tgl:overlay:${id}`;
  }

  async create() {
    const o = makeOverlay();
    await this.redis.set(this.key(o.id), o);
    return o;
  }

  async get(id: string) {
    const o = await this.redis.get<Overlay>(this.key(id));
    return o ?? null;
  }

  async getRev(id: string) {
    const o = await this.get(id);
    return o?.rev ?? null;
  }

  private async mutate(id: string, fn: (o: Overlay) => void): Promise<Overlay | null> {
    const o = await this.get(id);
    if (!o) return null;
    fn(o);
    touch(o);
    await this.redis.set(this.key(id), o);
    return o;
  }

  async addItem(id: string, input: ItemInput) {
    return this.mutate(id, (o) => pushItem(o, input));
  }

  async updateItem(id: string, itemId: string, patch: Partial<ItemInput>) {
    return this.mutate(id, (o) => {
      const idx = o.items.findIndex((it) => it.id === itemId);
      if (idx >= 0) o.items[idx] = applyItem(o.items[idx], patch);
    });
  }

  async deleteItem(id: string, itemId: string) {
    return this.mutate(id, (o) => {
      o.items = o.items.filter((it) => it.id !== itemId);
    });
  }

  async reorder(id: string, orderedIds: string[]) {
    return this.mutate(id, (o) => {
      o.items = reorderItems(o.items, orderedIds);
    });
  }

  async clearItems(id: string) {
    return this.mutate(id, (o) => {
      o.items = [];
    });
  }

  async updateOverlay(id: string, patch: OverlayPatch) {
    return this.mutate(id, (o) => {
      if (patch.name !== undefined) o.name = patch.name;
      if (patch.config) o.config = { ...o.config, ...patch.config };
    });
  }
}

// --- Backend selection -------------------------------------------------------

function redisCreds() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

export function storageMode(): "redis" | "memory" {
  return redisCreds() ? "redis" : "memory";
}

let storePromise: Promise<Store> | null = null;

async function buildStore(): Promise<Store> {
  const creds = redisCreds();
  if (creds) {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis(creds) as unknown as RedisClient;
    return new RedisStore(redis);
  }
  return new MemoryStore();
}

export function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = buildStore().catch((err) => {
      storePromise = null;
      throw err;
    });
  }
  return storePromise;
}
