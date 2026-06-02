"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { giftImage, type Gift } from "@/lib/gifts";
import GiftPicker from "@/components/GiftPicker";
import { TickerTrack, u } from "@/app/overlay/[id]/OverlayClient";
import {
  DEFAULT_GIFT_SCALE,
  DEFAULT_TEXT_SCALE,
  DEFAULT_TICKER_SCALE,
  DEFAULT_TICKER_SPEED,
  MAX_TICKER_ENTRIES,
  type ItemInput,
  type Overlay,
  type OverlayItem,
  type TickerEntry,
} from "@/lib/types";

const clampPct = (v: number) => Math.min(100, Math.max(0, v));

export default function Dashboard({
  initial,
  storageMode,
}: {
  initial: Overlay;
  storageMode: "redis" | "memory";
}) {
  const [overlay, setOverlay] = useState<Overlay>(initial);
  const id = overlay.id;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // When set, the picker adds gifts to this ticker; otherwise it places a standalone gift.
  const [pickerTarget, setPickerTarget] = useState<string | null>(null);
  const [name, setName] = useState(overlay.name);
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  const [origin, setOrigin] = useState("");
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOrigin(window.location.origin), []);
  const overlayUrl = origin ? `${origin}/overlay/${id}` : `/overlay/${id}`;

  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<
    | null
    | { id: string; pointerId: number; sx: number; sy: number; ox: number; oy: number; w: number; h: number; cx: number; cy: number; moved: boolean; vert: boolean }
  >(null);

  const selected = overlay.items.find((it) => it.id === selectedId) ?? null;
  const bg = overlay.config.background;
  const transparent = bg === "transparent";

  // --- helpers ---------------------------------------------------------------

  function patchLocal(itemId: string, patch: Partial<OverlayItem>) {
    setOverlay((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
    }));
  }
  const commit = (itemId: string, patch: Partial<ItemInput>) =>
    api.updateItem(id, itemId, patch).then(setOverlay).catch(() => refresh());
  const refresh = () => api.get(id).then(setOverlay).catch(() => {});

  async function addGift(g: Gift) {
    const input: ItemInput = {
      type: "gift",
      giftId: g.id,
      name: g.name,
      emoji: g.emoji,
      imageUrl: giftImage(g.id),
      x: 50,
      y: 50,
      scale: DEFAULT_GIFT_SCALE,
      rotation: 0,
    };
    const next = await api.addItem(id, input).catch(() => null);
    if (next) {
      setOverlay(next);
      setSelectedId(next.items[next.items.length - 1]?.id ?? null);
    }
    closePicker();
  }

  function openPicker(target: string | null) {
    setPickerTarget(target);
    setPickerOpen(true);
  }
  function closePicker() {
    setPickerOpen(false);
    setPickerTarget(null);
  }
  function onPick(g: Gift) {
    if (pickerTarget) addEntry(pickerTarget, g);
    else addGift(g);
  }

  async function addTicker() {
    const input: ItemInput = {
      type: "ticker",
      entries: [],
      speed: DEFAULT_TICKER_SPEED,
      x: 50,
      y: 88,
      scale: DEFAULT_TICKER_SCALE,
      rotation: 0,
    };
    const next = await api.addItem(id, input).catch(() => null);
    if (next) {
      setOverlay(next);
      const newId = next.items[next.items.length - 1]?.id ?? null;
      setSelectedId(newId);
      if (newId) openPicker(newId); // immediately add gifts to it
    }
  }

  function tickerCommit(tickerId: string, entries: TickerEntry[]) {
    patchLocal(tickerId, { entries });
    api.updateItem(id, tickerId, { entries }).then(setOverlay).catch(refresh);
  }
  function addEntry(tickerId: string, g: Gift) {
    const t = overlay.items.find((it) => it.id === tickerId);
    const entry: TickerEntry = {
      id: crypto.randomUUID(),
      giftId: g.id,
      name: g.name,
      emoji: g.emoji,
      imageUrl: giftImage(g.id),
      caption: "",
    };
    tickerCommit(tickerId, [...(t?.entries ?? []), entry].slice(0, MAX_TICKER_ENTRIES));
  }
  function entryEditLocal(entryId: string, patch: Partial<TickerEntry>) {
    if (!selected) return;
    patchLocal(selected.id, {
      entries: (selected.entries ?? []).map((e) => (e.id === entryId ? { ...e, ...patch } : e)),
    });
  }
  function entriesCommitCurrent() {
    // Fire-and-forget: local state already holds the latest captions, so we
    // don't setOverlay from the response (prevents an out-of-order response
    // from reverting a newer caption edit).
    if (selected) api.updateItem(id, selected.id, { entries: selected.entries ?? [] }).catch(refresh);
  }
  function entryRemove(entryId: string) {
    if (selected) tickerCommit(selected.id, (selected.entries ?? []).filter((e) => e.id !== entryId));
  }
  function entryMove(entryId: string, dir: -1 | 1) {
    if (!selected) return;
    const arr = [...(selected.entries ?? [])];
    const i = arr.findIndex((e) => e.id === entryId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    tickerCommit(selected.id, arr);
  }

  async function addText() {
    const input: ItemInput = {
      type: "text",
      text: "Your text",
      color: "#ffffff",
      x: 50,
      y: 25,
      scale: DEFAULT_TEXT_SCALE,
      rotation: 0,
    };
    const next = await api.addItem(id, input).catch(() => null);
    if (next) {
      setOverlay(next);
      setSelectedId(next.items[next.items.length - 1]?.id ?? null);
    }
  }

  function removeItem(itemId: string) {
    if (selectedId === itemId) setSelectedId(null);
    api.deleteItem(id, itemId).then(setOverlay).catch(refresh);
  }

  function clearAll() {
    if (overlay.items.length === 0) return;
    if (!window.confirm("Remove all items from the layout?")) return;
    setSelectedId(null);
    api.clear(id).then(setOverlay).catch(refresh);
  }

  function reorderTo(itemId: string, toEnd: boolean) {
    const ids = overlay.items.map((it) => it.id).filter((x) => x !== itemId);
    const order = toEnd ? [...ids, itemId] : [itemId, ...ids];
    setOverlay((prev) => ({ ...prev, items: order.map((x) => prev.items.find((it) => it.id === x)!) }));
    api.reorder(id, order).then(setOverlay).catch(refresh);
  }

  function setBackground(value: string) {
    api.updateOverlay(id, { config: { background: value } }).then(setOverlay).catch(refresh);
  }

  function commitName() {
    const n = name.trim() || "Untitled";
    if (n === overlay.name) return;
    api.updateOverlay(id, { name: n }).then(setOverlay).catch(() => setName(overlay.name));
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  // --- canvas drag -----------------------------------------------------------

  function onItemPointerDown(e: React.PointerEvent, item: OverlayItem) {
    e.stopPropagation();
    setSelectedId(item.id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = {
      id: item.id,
      pointerId: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      ox: item.x,
      oy: item.y,
      w: rect.width,
      h: rect.height,
      cx: item.x,
      cy: item.y,
      moved: false,
      vert: item.type === "ticker", // tickers are full-width: only y matters
    };
  }

  function onItemPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const nx = clampPct(d.ox + ((e.clientX - d.sx) / d.w) * 100);
    const ny = clampPct(d.oy + ((e.clientY - d.sy) / d.h) * 100);
    d.cx = nx;
    d.cy = ny;
    d.moved = true;
    patchLocal(d.id, d.vert ? { y: ny } : { x: nx, y: ny });
  }

  function onItemPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    if (d.moved) commit(d.id, d.vert ? { y: d.cy } : { x: d.cx, y: d.cy });
  }

  // --- render ----------------------------------------------------------------

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#fe2c55] text-lg">🎨</span>
            <div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                className="w-full rounded bg-transparent text-lg font-semibold outline-none focus:bg-zinc-900 focus:px-2 focus:py-1"
                aria-label="Layout name"
              />
              <p className="text-xs text-zinc-500">Custom layout · {id}</p>
            </div>
          </div>
          <Link
            href={`/overlay/${id}`}
            target="_blank"
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900"
          >
            Open overlay ↗
          </Link>
        </header>

        {storageMode === "memory" && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
            ⚠ In-memory storage — this layout resets if the server restarts. Set Upstash Redis env
            vars for durable storage.
          </div>
        )}

        {/* Overlay URL */}
        <section className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
          <span className="text-sm font-medium text-zinc-300">Overlay URL</span>
          <input
            readOnly
            value={overlayUrl}
            onFocus={(e) => e.target.select()}
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-300"
          />
          <button
            onClick={copyUrl}
            className="rounded-lg bg-[#fe2c55] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={() => setShowHelp((s) => !s)}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900"
          >
            How to add
          </button>
          {showHelp && (
            <p className="w-full text-xs text-zinc-400">
              Paste this URL into <b>TikTok LIVE Studio → + Add Source → Link</b>, or an{" "}
              <b>OBS Browser Source</b> sized <b>1080 × 1920</b>. It updates live as you edit.
            </p>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Canvas */}
          <section>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => openPicker(null)}
                className="rounded-lg bg-[#fe2c55] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
              >
                ＋ Add gift
              </button>
              <button
                onClick={addTicker}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900"
              >
                ＋ Running gifts
              </button>
              <button
                onClick={addText}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900"
              >
                ＋ Text
              </button>
              <span className="mx-1 text-zinc-600">·</span>
              <label className="flex items-center gap-1 text-sm text-zinc-400">
                BG
                <input
                  type="color"
                  value={transparent ? "#000000" : bg}
                  onChange={(e) => setBackground(e.target.value)}
                  className="h-8 w-9 rounded border border-zinc-700 bg-transparent"
                  aria-label="Background color"
                />
              </label>
              <button
                onClick={() => setBackground("transparent")}
                className={`rounded-lg border px-3 py-2 text-xs transition ${
                  transparent ? "border-[#fe2c55] text-white" : "border-zinc-700 text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                Transparent
              </button>
              <span className="ml-auto text-xs text-zinc-500">{overlay.items.length} items</span>
              {overlay.items.length > 0 && (
                <button onClick={clearAll} className="text-sm text-zinc-400 hover:text-red-400">
                  Clear
                </button>
              )}
            </div>

            <div className="mx-auto w-full max-w-[360px]">
              <div className={`canvas-frame ${transparent ? "checker" : ""}`}>
                <div
                  ref={canvasRef}
                  className="tgl-stage"
                  style={{ background: transparent ? undefined : bg }}
                  onPointerDown={() => setSelectedId(null)}
                >
                  {overlay.items.map((item) =>
                    item.type === "ticker" ? (
                      <div
                        key={item.id}
                        className={`tgl-ticker canvas-item ${selectedId === item.id ? "selected" : ""}`}
                        style={{ top: `${item.y}%` }}
                        onPointerDown={(e) => onItemPointerDown(e, item)}
                        onPointerMove={onItemPointerMove}
                        onPointerUp={onItemPointerUp}
                      >
                        <TickerTrack item={item} paused />
                      </div>
                    ) : (
                      <div
                        key={item.id}
                        className={`tgl-it canvas-item ${selectedId === item.id ? "selected" : ""}`}
                        style={itemStyle(item)}
                        onPointerDown={(e) => onItemPointerDown(e, item)}
                        onPointerMove={onItemPointerMove}
                        onPointerUp={onItemPointerUp}
                      >
                        {itemContent(item)}
                      </div>
                    ),
                  )}
                </div>
              </div>
              <p className="mt-2 text-center text-xs text-zinc-500">
                9:16 · drag items to position · click to select
              </p>
            </div>
          </section>

          {/* Inspector */}
          <aside className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            {!selected ? (
              <p className="text-sm text-zinc-500">
                Add a gift, <b className="text-zinc-300">Running gifts</b>, or text — then{" "}
                <b className="text-zinc-300">click it on the canvas</b> to edit, resize, or delete it.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-medium">
                    {selected.type === "text"
                      ? "Text"
                      : selected.type === "ticker"
                        ? "Running gifts"
                        : selected.name || "Gift"}
                  </span>
                  <button
                    onClick={() => removeItem(selected.id)}
                    className="text-sm text-zinc-400 hover:text-red-400"
                  >
                    Delete
                  </button>
                </div>

                {selected.type === "text" && (
                  <>
                    <Labeled label="Text">
                      <input
                        value={selected.text ?? ""}
                        onChange={(e) => patchLocal(selected.id, { text: e.target.value })}
                        onBlur={(e) => commit(selected.id, { text: e.target.value })}
                        className="input"
                      />
                    </Labeled>
                    <Labeled label="Color">
                      <input
                        type="color"
                        value={selected.color ?? "#ffffff"}
                        onChange={(e) => patchLocal(selected.id, { color: e.target.value })}
                        onBlur={(e) => commit(selected.id, { color: e.target.value })}
                        className="h-8 w-12 rounded border border-zinc-700 bg-transparent"
                      />
                    </Labeled>
                  </>
                )}

                {selected.type === "ticker" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-400">
                        Gifts ({(selected.entries ?? []).length})
                      </span>
                      <button
                        onClick={() => openPicker(selected.id)}
                        className="rounded-md bg-[#fe2c55] px-2 py-1 text-xs font-medium text-white hover:brightness-110"
                      >
                        ＋ Add gift
                      </button>
                    </div>
                    {(selected.entries ?? []).length === 0 && (
                      <p className="text-xs text-zinc-500">No gifts yet — add some to start the running text.</p>
                    )}
                    <ul className="space-y-1">
                      {(selected.entries ?? []).map((e, i) => (
                        <li
                          key={e.id}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 p-1.5"
                        >
                          <span className="grid h-7 w-7 shrink-0 place-items-center text-lg">
                            {e.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={e.imageUrl} alt="" className="h-7 w-7 object-contain" />
                            ) : (
                              e.emoji
                            )}
                          </span>
                          <input
                            value={e.caption ?? ""}
                            maxLength={120}
                            onChange={(ev) => entryEditLocal(e.id, { caption: ev.target.value })}
                            onBlur={entriesCommitCurrent}
                            placeholder="Caption…"
                            className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 outline-none"
                          />
                          <button
                            onClick={() => entryMove(e.id, -1)}
                            disabled={i === 0}
                            className="px-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-30"
                            aria-label="Move up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => entryMove(e.id, 1)}
                            disabled={i === (selected.entries ?? []).length - 1}
                            className="px-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-30"
                            aria-label="Move down"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => entryRemove(e.id)}
                            className="px-1 text-zinc-500 hover:text-red-400"
                            aria-label="Remove"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                    <Labeled label={`Speed (${Math.round(selected.speed ?? 18)}s / loop)`}>
                      <input
                        type="range"
                        min={3}
                        max={60}
                        value={Math.round(selected.speed ?? 18)}
                        onChange={(ev) => patchLocal(selected.id, { speed: Number(ev.target.value) })}
                        onPointerUp={(ev) => commit(selected.id, { speed: Number((ev.target as HTMLInputElement).value) })}
                        onKeyUp={(ev) => commit(selected.id, { speed: Number((ev.target as HTMLInputElement).value) })}
                        className="w-full"
                      />
                    </Labeled>
                  </div>
                )}

                <Labeled label={`${selected.type === "ticker" ? "Gift size" : "Size"} (${Math.round(selected.scale)})`}>
                  <input
                    type="range"
                    min={2}
                    max={70}
                    value={Math.round(selected.scale)}
                    onChange={(e) => patchLocal(selected.id, { scale: Number(e.target.value) })}
                    onPointerUp={(e) => commit(selected.id, { scale: Number((e.target as HTMLInputElement).value) })}
                    onKeyUp={(e) => commit(selected.id, { scale: Number((e.target as HTMLInputElement).value) })}
                    className="w-full"
                  />
                </Labeled>

                {selected.type !== "ticker" && (
                  <Labeled label={`Rotation (${Math.round(selected.rotation)}°)`}>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      value={Math.round(selected.rotation)}
                      onChange={(e) => patchLocal(selected.id, { rotation: Number(e.target.value) })}
                      onPointerUp={(e) => commit(selected.id, { rotation: Number((e.target as HTMLInputElement).value) })}
                      onKeyUp={(e) => commit(selected.id, { rotation: Number((e.target as HTMLInputElement).value) })}
                      className="w-full"
                    />
                  </Labeled>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => reorderTo(selected.id, true)}
                    className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900"
                  >
                    Bring to front
                  </button>
                  <button
                    onClick={() => reorderTo(selected.id, false)}
                    className="flex-1 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900"
                  >
                    Send to back
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>

        <p className="mt-6 text-xs text-zinc-600">
          Gift names &amp; artwork are property of TikTok / ByteDance. This tool is unofficial and not
          endorsed by TikTok.
        </p>
      </div>

      {pickerOpen && <GiftPicker onPick={onPick} onClose={closePicker} />}
    </main>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function itemStyle(item: OverlayItem): React.CSSProperties {
  const base: React.CSSProperties = {
    left: `${item.x}%`,
    top: `${item.y}%`,
    transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
  };
  if (item.type === "text") return { ...base, fontSize: u(item.scale), color: item.color || "#fff" };
  if (item.imageUrl) return { ...base, width: u(item.scale) };
  return { ...base, fontSize: u(item.scale) };
}

function itemContent(item: OverlayItem) {
  if (item.type === "text") return item.text;
  if (item.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.imageUrl} alt={item.name || ""} className="tgl-gift-img" draggable={false} />;
  }
  return item.emoji || "🎁";
}
