import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

// POST /api/overlays → create a fresh overlay and return it (with its id).
export async function POST() {
  const store = await getStore();
  const overlay = await store.create();
  return NextResponse.json(overlay, { status: 201 });
}
