"use client";

import Image from "next/image";
import { BriefcaseBusiness, Check, ExternalLink, Loader2, Radio, Send, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { DraftPost, DraftResponse, PublishResult } from "@/lib/types";

export default function Home() {
  const [data, setData] = useState<DraftResponse | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isFetching, setIsFetching] = useState(false);
  const [isFetchingGlobal, setIsFetchingGlobal] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<PublishResult[]>([]);

  const selectedDrafts = useMemo(
    () => data?.drafts.filter((draft) => selected.has(draft.id)) ?? [],
    [data, selected]
  );

  async function fetchFifaDetails() {
    setIsFetching(true);
    setError("");
    setResults([]);

    try {
      const response = await fetch("/api/fifa-x", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to fetch from X.");
      }

      setData(payload);
      setSelected(new Set(payload.drafts.map((draft: DraftPost) => draft.id)));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Something went wrong.");
    } finally {
      setIsFetching(false);
    }
  }

  async function fetchGlobalIcons() {
    setIsFetchingGlobal(true);
    setError("");
    setResults([]);

    try {
      const response = await fetch("/api/global-icons", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to fetch global icons news.");
      }

      setData(payload);
      setSelected(new Set(payload.drafts.map((draft: DraftPost) => draft.id)));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Something went wrong.");
    } finally {
      setIsFetchingGlobal(false);
    }
  }

  async function postToX() {
    setIsPosting(true);
    setError("");
    setResults([]);

    try {
      const response = await fetch("/api/post-to-x", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ drafts: selectedDrafts })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to post to X.");
      }

      setResults(payload.results);
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : "Something went wrong.");
    } finally {
      setIsPosting(false);
    }
  }

  function toggleDraft(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8">
      <header className="flex flex-col gap-5 border-b border-slate-900/10 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-sm font-semibold text-teal-800 shadow-sm ring-1 ring-slate-900/10">
            <Radio size={15} />
            X trend studio
          </div>
          <h1 className="text-4xl font-black tracking-normal text-slate-950 sm:text-6xl">inLast5Mins</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">
            Ask Grok for a late-May 2026 FIFA World Cup thread, shape it into six ready-to-post tweets,
            pair each with a public image, and publish the selected posts.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
          <button
            onClick={fetchFifaDetails}
            disabled={isFetching || isFetchingGlobal}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-slate-950 px-5 font-bold text-white shadow-lg shadow-slate-950/15 transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isFetching ? <Loader2 className="animate-spin" size={19} /> : <Sparkles size={19} />}
            FIFA 2026 on X
          </button>
          <button
            onClick={fetchGlobalIcons}
            disabled={isFetching || isFetchingGlobal}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-teal-700 px-5 font-bold text-white shadow-lg shadow-teal-900/15 transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isFetchingGlobal ? <Loader2 className="animate-spin" size={19} /> : <BriefcaseBusiness size={19} />}
            Global icons news
          </button>
        </div>
      </header>

      {error ? (
        <section className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </section>
      ) : null}

      <section className="grid gap-4 py-6 lg:grid-cols-4">
        <Insight title={data?.topic === "global-icons" ? "Research mode" : "Latest match score"} value={data?.summary.score ?? "Click a button to ask Grok."} />
        <Insight title={data?.topic === "global-icons" ? "Verification" : "Controversy"} value={data?.summary.controversy ?? "Waiting for live signals."} />
        <Insight title={data?.topic === "global-icons" ? "People covered" : "Fan reaction"} value={data?.summary.fanReaction ?? "Drafts will appear below."} />
        <Insight title="Also trending" value={data?.summary.extra ?? "Add XAI_API_KEY to fetch real Grok drafts."} />
      </section>

      <section className="grid flex-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-4 md:grid-cols-2">
          {(data?.drafts ?? []).map((draft) => (
            <article key={draft.id} className="overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-slate-900/10">
              <div className="relative aspect-[16/9] bg-slate-200">
                <Image src={draft.imageUrl} alt={draft.angle} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
              </div>
              <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">{draft.angle}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{draft.content.length}/280 chars</p>
                  </div>
                  <button
                    onClick={() => toggleDraft(draft.id)}
                    aria-label={selected.has(draft.id) ? "Unselect draft" : "Select draft"}
                    className={`grid h-9 w-9 place-items-center rounded-md ring-1 transition ${
                      selected.has(draft.id)
                        ? "bg-teal-700 text-white ring-teal-700"
                        : "bg-white text-slate-500 ring-slate-300 hover:text-teal-700"
                    }`}
                  >
                    <Check size={18} />
                  </button>
                </div>
                <textarea
                  value={draft.content}
                  onChange={(event) => {
                    if (!data) return;
                    setData({
                      ...data,
                      drafts: data.drafts.map((item) =>
                        item.id === draft.id ? { ...item, content: event.target.value } : item
                      )
                    });
                  }}
                  className="min-h-36 w-full resize-none rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-teal-600 focus:bg-white"
                />
                {draft.suggestedVisual || draft.source ? (
                  <div className="space-y-2 rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                    {draft.suggestedVisual ? (
                      <p>
                        <span className="font-black text-slate-800">Visual:</span> {draft.suggestedVisual}
                      </p>
                    ) : null}
                    {draft.source ? (
                      <p>
                        <span className="font-black text-slate-800">Source:</span> {draft.source}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>
          ))}

          {!data ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-white/65 p-8 text-slate-600 md:col-span-2">
              Press <span className="font-bold text-slate-950">FIFA 2026 on X</span> or{" "}
              <span className="font-bold text-slate-950">Global icons news</span> to generate Grok draft posts.
            </div>
          ) : null}
        </div>

        <aside className="h-fit rounded-md bg-slate-950 p-5 text-white shadow-xl shadow-slate-950/15">
          <h2 className="text-xl font-black">Publish queue</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Grok generation is used for every new draft request.
          </p>

          <div className="mt-5 rounded-md bg-white/8 p-4">
            <div className="flex items-center justify-between text-sm">
              <span>Selected drafts</span>
              <strong>{selectedDrafts.length}</strong>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span>Source window</span>
              <strong>{data?.sourceWindow ?? "-"}</strong>
            </div>
          </div>

          <button
            onClick={postToX}
            disabled={!selectedDrafts.length || isPosting}
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-amber-400 px-4 font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPosting ? <Loader2 className="animate-spin" size={19} /> : <Send size={18} />}
            Post selected to X
          </button>

          {results.length ? (
            <div className="mt-5 space-y-3">
              {results.map((result) => (
                <div key={result.id} className="rounded-md bg-white/8 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold">{result.id}</span>
                    <span
                      className={`capitalize ${
                        result.status === "failed" ? "text-red-200" : "text-amber-200"
                      }`}
                    >
                      {result.status}
                    </span>
                  </div>
                  {result.url ? (
                    <a href={result.url} target="_blank" className="mt-2 inline-flex items-center gap-1 text-teal-200">
                      Open on X <ExternalLink size={14} />
                    </a>
                  ) : null}
                  {result.error ? (
                    <p className={result.status === "posted" ? "mt-2 text-amber-100" : "mt-2 text-red-200"}>
                      {result.error}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

function Insight({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md bg-white/80 p-4 shadow-sm ring-1 ring-slate-900/10">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-800">{value}</p>
    </div>
  );
}
