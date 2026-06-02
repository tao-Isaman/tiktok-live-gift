import { getStore } from "@/lib/store";

// Server-Sent Events stream that powers the live overlay. The overlay page
// opens an EventSource here; we push the full overlay on connect and again
// whenever its `rev` changes. One-way, low-frequency, plain HTTPS — friendly to
// OBS's embedded Chromium and Vercel serverless. EventSource auto-reconnects,
// and because we resend full state on connect the overlay can never go stale.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Hold the stream open as long as the platform allows (Vercel clamps to the
// plan max). When it does close, EventSource reconnects and we resend full
// state, so the overlay just keeps showing its last frame across the gap.
export const maxDuration = 800;

const POLL_MS = 1000;
const HEARTBEAT_MS = 15000;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const store = await getStore();
  const encoder = new TextEncoder();

  let poll: ReturnType<typeof setInterval> | undefined;
  let beat: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (poll) clearInterval(poll);
        if (beat) clearInterval(beat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      };

      // If the client disconnects (OBS scene change, tab close), stop polling.
      req.signal.addEventListener("abort", cleanup);

      // Tell EventSource to reconnect quickly if the connection drops.
      controller.enqueue(encoder.encode("retry: 2000\n\n"));

      let lastRev = -1;
      const initial = await store.get(id);
      if (initial) {
        lastRev = initial.rev;
        send("overlay", initial);
      } else {
        send("notfound", { id });
      }

      // `inFlight` guards against overlapping reads if a store call ever takes
      // longer than POLL_MS (e.g. a slow Redis round-trip).
      let inFlight = false;
      poll = setInterval(async () => {
        if (closed || inFlight) return;
        inFlight = true;
        try {
          const rev = await store.getRev(id);
          if (rev !== null && rev !== lastRev) {
            const overlay = await store.get(id);
            if (overlay) {
              lastRev = overlay.rev;
              send("overlay", overlay);
            }
          }
        } catch {
          /* transient store error — retry next tick */
        } finally {
          inFlight = false;
        }
      }, POLL_MS);

      // Comment-only heartbeat keeps the connection alive through proxies.
      beat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          cleanup();
        }
      }, HEARTBEAT_MS);
    },
    cancel() {
      closed = true;
      if (poll) clearInterval(poll);
      if (beat) clearInterval(beat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable proxy buffering (nginx/Vercel) so events flush immediately.
      "X-Accel-Buffering": "no",
    },
  });
}
