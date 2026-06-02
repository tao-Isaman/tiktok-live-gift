"use client";

import { useEffect, useState } from "react";
import type { Overlay, OverlayItem } from "@/lib/types";

// Sizes scale with the stage width via --tgl-u (1cqw, or 1vw fallback on
// renderers without container queries — see globals.css).
export const u = (n: number) => `calc(${n} * var(--tgl-u))`;

// The live overlay (TikTok LIVE Studio Link Source / OBS Browser Source).
// Renders each item freely positioned on a transparent, full-bleed stage and
// stays live via SSE. Sizes use container-query units (cqw) so the layout is
// identical here and in the editor's smaller canvas.
export default function OverlayClient({ id, initial }: { id: string; initial: Overlay | null }) {
  const [overlay, setOverlay] = useState<Overlay | null>(initial);

  useEffect(() => {
    const es = new EventSource(`/api/overlays/${id}/stream`);
    es.addEventListener("overlay", (e) => {
      try {
        setOverlay(JSON.parse((e as MessageEvent).data) as Overlay);
      } catch {
        /* ignore malformed frame */
      }
    });
    es.addEventListener("notfound", () => setOverlay(null));
    return () => es.close();
  }, [id]);

  const bg =
    overlay && overlay.config.background !== "transparent" ? overlay.config.background : "transparent";

  return (
    <div className="tgl-stage" style={{ background: bg }}>
      {overlay?.items.map((item) => (
        <StageItem key={item.id} item={item} />
      ))}
    </div>
  );
}

/** The scrolling row of gifts+captions. Shared by the overlay (animated) and
 * the editor (paused for easy positioning). */
export function TickerTrack({ item, paused }: { item: OverlayItem; paused?: boolean }) {
  const entries = item.entries ?? [];
  if (entries.length === 0) {
    return paused ? <div className="tgl-ticker-empty">Add gifts to the ticker…</div> : null;
  }
  const loop = [...entries, ...entries]; // duplicate for a seamless loop
  return (
    <div
      className="tgl-ticker-track"
      style={{
        fontSize: u(item.scale),
        animationDuration: `${item.speed ?? 18}s`,
        animationPlayState: paused ? "paused" : "running",
      }}
    >
      {loop.map((e, i) => (
        // key distinguishes the two copies (0/1) so reorders move DOM nodes
        // rather than recreating them.
        <div className="tgl-ticker-item" key={`${i < entries.length ? 0 : 1}:${e.id}`}>
          {e.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.imageUrl} alt={e.name || ""} className="tgl-ticker-img" draggable={false} />
          ) : (
            <span className="tgl-ticker-emoji">{e.emoji || "🎁"}</span>
          )}
          {e.caption ? <span className="tgl-ticker-cap">{e.caption}</span> : null}
        </div>
      ))}
    </div>
  );
}

/** Pure presentational render of one item — shared shape with the editor. */
export function StageItem({ item }: { item: OverlayItem }) {
  if (item.type === "ticker") {
    if (!item.entries || item.entries.length === 0) return null; // nothing to show
    return (
      <div className="tgl-ticker" style={{ top: `${item.y}%` }}>
        <TickerTrack item={item} />
      </div>
    );
  }

  const base: React.CSSProperties = {
    left: `${item.x}%`,
    top: `${item.y}%`,
    transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
  };

  if (item.type === "text") {
    return (
      <div className="tgl-it" style={{ ...base, fontSize: u(item.scale), color: item.color || "#fff" }}>
        {item.text}
      </div>
    );
  }

  if (item.imageUrl) {
    return (
      <div className="tgl-it" style={{ ...base, width: u(item.scale) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.imageUrl} alt={item.name || ""} className="tgl-gift-img" draggable={false} />
      </div>
    );
  }

  return (
    <div className="tgl-it" style={{ ...base, fontSize: u(item.scale) }}>
      {item.emoji || "🎁"}
    </div>
  );
}
