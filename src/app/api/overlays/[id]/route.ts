import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { parseOverlayPatch } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/overlays/:id → full overlay state (used for initial hydration).
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const store = await getStore();
  const overlay = await store.get(id);
  if (!overlay) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(overlay);
}

// PATCH /api/overlays/:id → update title and/or config.
export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const patch = parseOverlayPatch(await req.json().catch(() => null));
  if (!patch) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const store = await getStore();
  const overlay = await store.updateOverlay(id, patch);
  if (!overlay) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(overlay);
}
