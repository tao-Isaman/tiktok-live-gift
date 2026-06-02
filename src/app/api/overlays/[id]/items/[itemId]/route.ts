import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { parseItemPatch } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

// PATCH /api/overlays/:id/items/:itemId → edit an existing element.
export async function PATCH(req: Request, ctx: Ctx) {
  const { id, itemId } = await ctx.params;
  const patch = parseItemPatch(await req.json().catch(() => null));
  if (!patch) return NextResponse.json({ error: "invalid_item" }, { status: 400 });
  const store = await getStore();
  const overlay = await store.updateItem(id, itemId, patch);
  if (!overlay) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(overlay);
}

// DELETE /api/overlays/:id/items/:itemId → remove one element.
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id, itemId } = await ctx.params;
  const store = await getStore();
  const overlay = await store.deleteItem(id, itemId);
  if (!overlay) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(overlay);
}
