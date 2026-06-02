"use client";

import { useMemo, useState } from "react";
import { GIFTS, giftImage, tierOf, type Gift, type GiftTier } from "@/lib/gifts";

const TIERS: { key: GiftTier | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "basic", label: "💎1" },
  { key: "casual", label: "5–99" },
  { key: "mid", label: "100–999" },
  { key: "premium", label: "1k–9k" },
  { key: "flagship", label: "10k+" },
];

export default function GiftPicker({ onPick, onClose }: { onPick: (g: Gift) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<GiftTier | "all">("all");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return GIFTS.filter(
      (g) => (tier === "all" || tierOf(g.coins) === tier) && g.name.toLowerCase().includes(needle),
    );
  }, [q, tier]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-zinc-800 p-3">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search gifts…"
            className="input"
          />
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
          >
            Close
          </button>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-zinc-800 px-3 py-2">
          {TIERS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTier(t.key)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                tier === t.key ? "bg-[#fe2c55] text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 overflow-y-auto p-3 sm:grid-cols-4">
          {list.map((g) => {
            const img = giftImage(g.id);
            return (
              <button
                key={g.id}
                onClick={() => onPick(g)}
                title={g.name}
                className="flex flex-col items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-2 transition hover:border-zinc-500"
              >
                <span className="grid h-12 w-12 place-items-center text-3xl">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="h-12 w-12 object-contain" />
                  ) : (
                    g.emoji
                  )}
                </span>
                <span className="w-full truncate text-center text-xs text-zinc-200">{g.name}</span>
                <span className="text-[10px] text-amber-400">💎 {g.coins.toLocaleString()}</span>
              </button>
            );
          })}
          {list.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-zinc-500">No gifts match.</p>
          )}
        </div>
      </div>
    </div>
  );
}
