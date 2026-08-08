"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { importSpotifyPlaylistAction } from "@/lib/actions";
import { nextUniqueTitle } from "@/lib/titles";
import type { AnnotatedPlaylist, SpotifyPlaylistSummary } from "@/lib/types";

export function PlaylistGrid({
  annotated,
  spotify,
  spotifyError = null,
}: {
  annotated: AnnotatedPlaylist[];
  spotify: SpotifyPlaylistSummary[];
  spotifyError?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<SpotifyPlaylistSummary | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const existingTitles = useMemo(
    () => annotated.map((p) => p.title),
    [annotated],
  );

  function openImport(playlist: SpotifyPlaylistSummary) {
    setDraft(playlist);
    setDraftTitle(nextUniqueTitle(existingTitles, playlist.name));
  }

  function cancelImport() {
    setDraft(null);
    setDraftTitle("");
  }

  return (
    <div className="flex w-full flex-col gap-16">
      <section className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-mono text-[22px] uppercase text-white">
            Annotated Playlists
          </h1>
          <Link
            href="/playlists/new"
            className="font-mono text-[14px] text-[#1ed760] hover:underline"
          >
            + New Playlist
          </Link>
        </div>
        {annotated.length === 0 ? (
          <p className="font-mono text-white/50">
            No annotated playlists yet. Pick an existing playlist from Spotify below or create a new one!
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {annotated.map((p) => (
              <Link
                key={p.id}
                href={`/playlists/${p.id}`}
                className="group flex flex-col gap-2"
              >
                <div className="relative aspect-square size-full max-w-[200px] overflow-hidden bg-[#1c1c1c] transition group-hover:opacity-90">
                  <Image
                    src={p.coverImageUrl || "/assets/mascot.png"}
                    alt={p.title}
                    fill
                    className="object-cover"
                    sizes="200px"
                    unoptimized
                  />
                </div>
                <span className="font-mono text-sm text-white/80 group-hover:text-white">
                  {p.title}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="font-mono text-[22px] uppercase text-white">
          all playlists
        </h2>
        <p className="font-mono text-sm text-white/50">
          Click on a playlist to create a new annotated copy.
        </p>
        {spotifyError ? (
          <p className="font-mono text-sm text-red-400">{spotifyError}</p>
        ) : spotify.length === 0 ? (
          <p className="font-mono text-sm text-white/50">
            No Spotify playlists found for this account.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {spotify.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={pending || draft !== null}
                onClick={() => openImport(p)}
                className="group flex flex-col gap-2 text-left disabled:opacity-50"
              >
                <div className="relative aspect-square w-full max-w-[200px] overflow-hidden bg-[#1c1c1c] transition group-hover:opacity-90">
                  <Image
                    src={p.imageUrl || "/assets/mascot.png"}
                    alt={p.name}
                    fill
                    className="object-cover"
                    sizes="200px"
                    unoptimized
                  />
                </div>
                <span className="font-mono text-sm text-white/80 group-hover:text-white">
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {draft ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-dialog-title"
        >
          <div className="flex w-full max-w-md flex-col gap-6 rounded-lg border border-white/10 bg-[#121212] p-6">
            <div className="flex gap-4">
              <div className="relative size-20 shrink-0 overflow-hidden bg-[#1c1c1c]">
                <Image
                  src={draft.imageUrl || "/assets/mascot.png"}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="80px"
                  unoptimized
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  id="import-dialog-title"
                  className="font-mono text-[18px] text-white"
                >
                  new notes playlist
                </h3>
                <p className="mt-1 font-mono text-sm text-white/50">
                  from spotify: {draft.name}
                </p>
              </div>
            </div>

            <label className="flex flex-col gap-2 font-mono text-sm text-white/70">
              name
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                autoFocus
                className="rounded border border-white/10 bg-[#1c1c1c] px-3 py-3 text-white focus:outline-none focus:ring-1 focus:ring-[#1ed760]"
              />
            </label>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={cancelImport}
                className="rounded px-4 py-2 font-mono text-sm text-white/60 hover:text-white"
              >
                cancel
              </button>
              <button
                type="button"
                disabled={pending || !draftTitle.trim()}
                onClick={() => {
                  startTransition(() => {
                    void importSpotifyPlaylistAction(draft.id, draftTitle.trim());
                  });
                }}
                className="rounded-lg bg-[#1ed760] px-4 py-2 font-sans text-sm font-semibold text-black hover:brightness-110 disabled:opacity-50"
              >
                {pending ? "saving…" : "save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
