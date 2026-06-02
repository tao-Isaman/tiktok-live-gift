import CreateOverlay from "@/components/CreateOverlay";

const STEPS = [
  { n: "1", title: "Design your layout", body: "Pick TikTok gifts and drag, resize & rotate them on a portrait canvas." },
  { n: "2", title: "Copy the overlay URL", body: "Each layout gets one public, transparent overlay URL." },
  { n: "3", title: "Show it on TikTok Live", body: "Paste the URL into TikTok LIVE Studio’s Link Source (or an OBS Browser Source)." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-16 px-6 py-20 sm:py-28">
        <section className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
            🎬 TikTok Gift Live · Overlay Studio
          </span>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Design a custom gift layout,
            <span className="text-[#fe2c55]"> show it on your TikTok Live.</span>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-zinc-400">
            Arrange TikTok gift images on a canvas, get a single overlay URL, and drop it into TikTok
            LIVE Studio or OBS. Whatever you change updates live on stream — no refresh.
          </p>
          <CreateOverlay />
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="mb-3 grid h-8 w-8 place-items-center rounded-full bg-[#fe2c55] text-sm font-bold text-white">
                {s.n}
              </div>
              <h3 className="mb-1 font-semibold">{s.title}</h3>
              <p className="text-sm text-zinc-400">{s.body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
