import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { parseItemInput } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/overlays/:id/items → append an element to the playlist.
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const input = parseItemInput(await req.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "invalid_item" }, { status: 400 });
  const store = await getStore();
  const overlay = await store.addItem(id, input);
  if (!overlay) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(overlay, { status: 201 });
}

// PUT /api/overlays/:id/items → reorder via { order: string[] } of item ids.
export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { order?: unknown } | null;
  const order = Array.isArray(body?.order) ? body.order.filter((x): x is string => typeof x === "string") : null;
  if (!order) return NextResponse.json({ error: "invalid_order" }, { status: 400 });
  const store = await getStore();
  const overlay = await store.reorder(id, order);
  if (!overlay) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(overlay);
}

// DELETE /api/overlays/:id/items → clear the whole playlist.
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const store = await getStore();
  const overlay = await store.clearItems(id);
  if (!overlay) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(overlay);
}
