"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

/** Pull an overlay id out of a pasted dashboard/overlay URL or a raw id. */
function extractId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const m = s.match(/(?:overlay|dashboard)\/([^/?#]+)/);
  if (m) return m[1];
  return s.split(/[/?#]/).filter(Boolean).pop() ?? null;
}

export default function CreateOverlay() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [resume, setResume] = useState("");

  async function create() {
    setCreating(true);
    try {
      const overlay = await api.create();
      router.push(`/dashboard/${overlay.id}`);
    } catch {
      setCreating(false);
    }
  }

  function go() {
    const id = extractId(resume);
    if (id) router.push(`/dashboard/${id}`);
  }

  return (
    <div className="flex w-full flex-col gap-4 sm:max-w-md">
      <button
        onClick={create}
        disabled={creating}
        className="rounded-full bg-[#fe2c55] px-6 py-3.5 text-base font-semibold text-white shadow-[0_10px_30px_rgba(254,44,85,0.25)] transition hover:brightness-110 disabled:opacity-60"
      >
        {creating ? "Creating…" : "Create a layout →"}
      </button>

      <div className="flex items-center gap-2">
        <input
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder="Resume: paste a dashboard URL or id"
          className="min-w-0 flex-1 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-zinc-500"
        />
        <button
          onClick={go}
          className="rounded-full border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-900"
        >
          Open
        </button>
      </div>
    </div>
  );
}
