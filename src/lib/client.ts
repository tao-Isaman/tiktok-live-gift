// Thin fetch wrappers used by the editor (client side). Every mutation returns
// the full, updated Overlay — the same payload the SSE stream pushes to the
// live overlay.

import type { ItemInput, Overlay } from "./types";

async function asOverlay(res: Response): Promise<Overlay> {
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<Overlay>;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  create: () => fetch("/api/overlays", { method: "POST" }).then(asOverlay),

  get: (id: string) => fetch(`/api/overlays/${id}`).then(asOverlay),

  addItem: (id: string, input: ItemInput) =>
    fetch(`/api/overlays/${id}/items`, jsonInit("POST", input)).then(asOverlay),

  updateItem: (id: string, itemId: string, patch: Partial<ItemInput>) =>
    fetch(`/api/overlays/${id}/items/${itemId}`, jsonInit("PATCH", patch)).then(asOverlay),

  deleteItem: (id: string, itemId: string) =>
    fetch(`/api/overlays/${id}/items/${itemId}`, { method: "DELETE" }).then(asOverlay),

  reorder: (id: string, order: string[]) =>
    fetch(`/api/overlays/${id}/items`, jsonInit("PUT", { order })).then(asOverlay),

  clear: (id: string) => fetch(`/api/overlays/${id}/items`, { method: "DELETE" }).then(asOverlay),

  updateOverlay: (id: string, patch: { name?: string; config?: { background?: string } }) =>
    fetch(`/api/overlays/${id}`, jsonInit("PATCH", patch)).then(asOverlay),
};
