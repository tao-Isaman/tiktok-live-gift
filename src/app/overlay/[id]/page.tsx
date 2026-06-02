import { getStore } from "@/lib/store";
import OverlayClient from "./OverlayClient";

// This is the page pasted into TikTok LIVE Studio's Link Source / an OBS
// Browser Source. Rendered on a transparent body (see globals.css). We hydrate
// the initial state server-side so it shows instantly, then OverlayClient keeps
// it live via SSE.
export const dynamic = "force-dynamic";

export default async function OverlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const initial = await store.get(id);
  return <OverlayClient id={id} initial={initial} />;
}
