import Link from "next/link";
import { getStore, storageMode } from "@/lib/store";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const overlay = await store.get(id);

  if (!overlay) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center text-zinc-100">
        <h1 className="text-2xl font-semibold">Overlay not found</h1>
        <p className="max-w-md text-zinc-400">
          This overlay doesn’t exist (or the in-memory store was reset on a server restart).
          Create a new one to get started.
        </p>
        <Link
          href="/"
          className="rounded-full bg-[#fe2c55] px-5 py-2.5 font-medium text-white transition hover:brightness-110"
        >
          Create a new overlay
        </Link>
      </main>
    );
  }

  return <Dashboard initial={overlay} storageMode={storageMode()} />;
}
