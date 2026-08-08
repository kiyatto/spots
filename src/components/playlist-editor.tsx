"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  renamePlaylistAction,
  savePlaylistEditsAction,
  searchTracksAction,
} from "@/lib/actions";
import { formatDuration } from "@/lib/format";
import type {
  AnnotatedPlaylist,
  SpotifyTrack,
  TrackNote,
  TrackNoteStatus,
} from "@/lib/types";

type DraftNote = {
  key: string;
  spotifyTrackId: string;
  trackName: string;
  artistNames: string;
  albumName: string;
  albumImageUrl: string | null;
  durationMs: number;
  note: string;
  status: TrackNoteStatus;
  isNew: boolean;
  markedForRemoval: boolean;
};

function cloneDraft(notes: TrackNote[]): DraftNote[] {
  return notes.map((n) => ({
    key: n.id,
    spotifyTrackId: n.spotifyTrackId,
    trackName: n.trackName,
    artistNames: n.artistNames,
    albumName: n.albumName,
    albumImageUrl: n.albumImageUrl,
    durationMs: n.durationMs,
    note: n.note,
    status: n.status,
    isNew: false,
    markedForRemoval: false,
  }));
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function TitleEditor({
  playlistId,
  title,
}: {
  playlistId: string;
  title: string;
}) {
  const [value, setValue] = useState(title);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setValue(title);
  }, [title]);

  function save() {
    const next = value.trim();
    if (!next || next === title) {
      setValue(title);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const saved = await renamePlaylistAction(playlistId, next);
      setValue(saved);
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="font-mono text-[18px] text-white hover:underline"
        title="Rename playlist"
      >
        {title}
      </button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <input
        value={value}
        disabled={pending}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setValue(title);
            setEditing(false);
          }
        }}
        className="w-full rounded border border-white/10 bg-[#1c1c1c] px-2 py-1 text-center font-mono text-[16px] text-white focus:outline-none focus:ring-1 focus:ring-[#1ed760]"
      />
      <div className="flex justify-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setValue(title);
            setEditing(false);
          }}
          className="font-mono text-xs text-white/50 hover:text-white"
        >
          cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="font-mono text-xs text-[#1ed760] hover:underline"
        >
          save
        </button>
      </div>
    </div>
  );
}

function SearchAdd({
  disabled,
  existingTrackIds,
  onAdd,
}: {
  disabled?: boolean;
  existingTrackIds: Set<string>;
  onAdd: (track: SpotifyTrack) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (results.length === 0) return;
    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (!root || root.contains(event.target as Node)) return;
      setResults([]);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [results.length]);

  return (
    <div ref={rootRef} className="flex w-full flex-col gap-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const tracks = await searchTracksAction(query);
            setResults(tracks);
          });
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          placeholder="search for tracks to add…"
          className="flex-1 rounded border border-white/10 bg-[#1c1c1c] px-3 py-2 font-mono text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#1ed760] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={pending || disabled}
          className="rounded bg-white/10 px-3 py-2 font-mono text-sm text-white hover:bg-white/20 disabled:opacity-50"
        >
          search
        </button>
      </form>
      {results.length > 0 ? (
        <ul className="flex max-h-48 flex-col gap-2 overflow-auto">
          {results.map((track) => {
            const already = existingTrackIds.has(track.id);
            return (
              <li
                key={track.id}
                className="flex items-center justify-between gap-2 rounded bg-[#1c1c1c] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm text-white">
                    {track.name}
                  </p>
                  <p className="truncate font-mono text-xs text-white/50">
                    {track.artists}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={already || disabled}
                  onClick={() => {
                    onAdd(track);
                    setResults([]);
                    setQuery("");
                  }}
                  className="shrink-0 font-mono text-xs text-[#1ed760] hover:underline disabled:text-white/30 disabled:no-underline"
                >
                  {already ? "added" : "add"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function TrackRow({
  note,
  index,
  editable,
  onNoteChange,
  onRemove,
}: {
  note: DraftNote;
  index: number;
  editable: boolean;
  onNoteChange: (key: string, value: string) => void;
  onRemove: (key: string) => void;
}) {
  const faded =
    note.status === "removed_from_spotify" || note.markedForRemoval;

  return (
    <div
      className={`group grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4 px-2 py-3 ${
        faded ? "opacity-40" : ""
      }`}
    >
      <div className="relative grid grid-cols-[32px_50px_minmax(0,1fr)_minmax(0,1fr)_56px] items-center gap-3 rounded bg-[#1c1c1c] px-4 py-2.5">
        <span className="font-mono text-[16px] text-white">{index + 1}</span>
        <div className="relative size-[50px] overflow-hidden rounded-[6px] bg-black/40">
          <Image
            src={note.albumImageUrl || "/assets/mascot.png"}
            alt=""
            fill
            className="object-cover"
            sizes="50px"
            unoptimized
          />
        </div>
        <div className="min-w-0">
          <p className="truncate font-mono text-[16px] text-white">
            {note.trackName}
            {note.isNew ? (
              <span className="ml-2 text-[12px] text-[#1ed760]">new</span>
            ) : null}
          </p>
          <p className="truncate font-mono text-[12px] text-white/50">
            {note.artistNames}
            {note.markedForRemoval
              ? " · will remove from spotify"
              : note.status === "removed_from_spotify"
                ? " · removed from spotify"
                : ""}
          </p>
        </div>
        <p className="truncate font-mono text-[16px] text-white/80">
          {note.albumName}
        </p>
        <p className="font-mono text-[16px] text-white/80">
          {formatDuration(note.durationMs)}
        </p>

        {editable &&
        !note.markedForRemoval &&
        note.status !== "removed_from_spotify" ? (
          <button
            type="button"
            title="Remove from Spotify (on save)"
            onClick={() => onRemove(note.key)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-white/50 opacity-0 transition group-hover:opacity-100 hover:text-red-400 focus-visible:opacity-100"
          >
            <TrashIcon className="size-4" />
            <span className="sr-only">Remove from Spotify</span>
          </button>
        ) : null}
      </div>
      <div className="flex flex-col justify-center">
        {editable ? (
          <textarea
            value={note.note}
            rows={2}
            placeholder="write a note…"
            onChange={(e) => onNoteChange(note.key, e.target.value)}
            className="w-full resize-none bg-transparent font-mono text-[16px] text-white placeholder:text-white/30 focus:outline-none"
          />
        ) : (
          <p className="font-mono text-[16px] text-white">
            {note.note || "—"}
          </p>
        )}
      </div>
    </div>
  );
}

export function PlaylistEditor({
  playlist,
  editable,
}: {
  playlist: AnnotatedPlaylist;
  editable: boolean;
}) {
  const [draft, setDraft] = useState<DraftNote[]>(() =>
    cloneDraft(playlist.notes),
  );
  const [baseline, setBaseline] = useState(() => cloneDraft(playlist.notes));
  const [pendingAdds, setPendingAdds] = useState<SpotifyTrack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const sharePath = `/p/${playlist.shareSlug}`;
  const router = useRouter();

  useEffect(() => {
    const next = cloneDraft(playlist.notes);
    setDraft(next);
    setBaseline(next);
    setPendingAdds([]);
    setError(null);
    // Reset when the saved playlist identity/content refreshes from the server
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist.id, playlist.lastSyncedAt, JSON.stringify(playlist.notes)]);

  const dirty = useMemo(() => {
    if (pendingAdds.length > 0) return true;
    if (draft.some((n) => n.markedForRemoval || n.isNew)) return true;
    if (draft.length !== baseline.length) return true;
    const baseByKey = new Map(baseline.map((n) => [n.key, n]));
    return draft.some((n) => {
      const b = baseByKey.get(n.key);
      if (!b) return true;
      return n.note !== b.note || n.status !== b.status;
    });
  }, [draft, baseline, pendingAdds]);

  const existingTrackIds = useMemo(
    () =>
      new Set(
        draft.filter((n) => !n.markedForRemoval).map((n) => n.spotifyTrackId),
      ),
    [draft],
  );

  function handleCancel() {
    if (
      dirty &&
      !window.confirm("Discard unsaved changes?")
    ) {
      return;
    }
    setDraft(cloneDraft(playlist.notes));
    setBaseline(cloneDraft(playlist.notes));
    setPendingAdds([]);
    setError(null);
  }

  function handleBack() {
    if (dirty) {
      setLeaveConfirmOpen(true);
      return;
    }
    router.push("/dashboard");
  }

  function confirmLeave() {
    setLeaveConfirmOpen(false);
    router.push("/dashboard");
  }

  useEffect(() => {
    if (!editable) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, editable]);

  function handleAdd(track: SpotifyTrack) {
    if (existingTrackIds.has(track.id)) return;
    setPendingAdds((prev) => [...prev, track]);
    setDraft((prev) => [
      ...prev,
      {
        key: `new-${track.id}`,
        spotifyTrackId: track.id,
        trackName: track.name,
        artistNames: track.artists,
        albumName: track.albumName,
        albumImageUrl: track.albumImageUrl,
        durationMs: track.durationMs,
        note: "",
        status: "active",
        isNew: true,
        markedForRemoval: false,
      },
    ]);
  }

  function handleRemove(key: string) {
    setDraft((prev) => {
      const target = prev.find((n) => n.key === key);
      if (!target) return prev;
      if (target.isNew) {
        setPendingAdds((adds) =>
          adds.filter((t) => t.id !== target.spotifyTrackId),
        );
        return prev.filter((n) => n.key !== key);
      }
      return prev.map((n) =>
        n.key === key ? { ...n, markedForRemoval: true } : n,
      );
    });
  }

  function handleSave() {
    const removeIds = draft
      .filter((n) => n.markedForRemoval && !n.isNew)
      .map((n) => n.spotifyTrackId);

    const finalNotes = draft
      .filter((n) => !(n.isNew && n.markedForRemoval))
      .map((n) => ({
        spotifyTrackId: n.spotifyTrackId,
        trackName: n.trackName,
        artistNames: n.artistNames,
        albumName: n.albumName,
        albumImageUrl: n.albumImageUrl,
        durationMs: n.durationMs,
        note: n.note,
        status: (n.markedForRemoval
          ? "removed_from_spotify"
          : n.status) as TrackNoteStatus,
      }));

    const willTouchSpotify = pendingAdds.length > 0 || removeIds.length > 0;
    if (
      willTouchSpotify &&
      !window.confirm(
        "Saving will update your Spotify playlist (add/remove tracks) and store your notes. Continue?",
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const saved = await savePlaylistEditsAction({
          playlistId: playlist.id,
          notes: finalNotes,
          addTracks: pendingAdds,
          removeSpotifyTrackIds: removeIds,
        });
        const next = cloneDraft(saved.notes);
        setDraft(next);
        setBaseline(next);
        setPendingAdds([]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  return (
    <div
      className={`relative flex min-h-full flex-col gap-8 ${
        editable && dirty ? "pb-24" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          {editable ? (
            <button
              type="button"
              onClick={handleBack}
              className="self-start font-mono text-[18px] text-white tracking-tight hover:opacity-80"
            >
              spots
            </button>
          ) : (
            <Link
              href="/"
              className="self-start font-mono text-[18px] text-white tracking-tight hover:opacity-80"
            >
              spots
            </Link>
          )}
          {editable ? (
            <button
              type="button"
              onClick={handleBack}
              className="self-start font-mono text-sm text-white/50 hover:text-white"
            >
              ← back
            </button>
          ) : null}
        </div>

        {editable ? (
          <div className="flex flex-col items-stretch gap-2">
            <button
              type="button"
              onClick={async () => {
                const url = `${window.location.origin}${sharePath}`;
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="rounded-lg bg-white/10 px-4 py-2 font-mono text-sm text-white hover:bg-white/20"
            >
              {copied ? "link copied" : "copy share link"}
            </button>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="rounded-lg bg-white/10 px-4 py-2 text-center font-mono text-sm text-white hover:bg-white/20"
            >
              open in Spotify
            </a>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-10 lg:flex-row lg:gap-8">
        <aside className="flex w-full shrink-0 flex-col gap-8 lg:w-[220px]">
          <div className="flex flex-col items-center gap-2.5">
            <div className="relative size-[200px] overflow-hidden bg-[#1c1c1c]">
              <Image
                src={playlist.coverImageUrl || "/assets/mascot.png"}
                alt={playlist.title}
                fill
                className="object-cover"
                sizes="200px"
                unoptimized
              />
            </div>
            {editable ? (
              <TitleEditor playlistId={playlist.id} title={playlist.title} />
            ) : (
              <p className="font-mono text-[18px] text-white">{playlist.title}</p>
            )}
          </div>

          {editable ? (
            <div className="flex flex-col gap-3 font-mono text-sm text-white/70">
              <SearchAdd
                disabled={pending}
                existingTrackIds={existingTrackIds}
                onAdd={handleAdd}
              />
              {error ? (
                <p className="font-mono text-xs text-red-400">{error}</p>
              ) : null}
            </div>
          ) : null}
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-2 grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4 px-2">
            <div className="grid grid-cols-[32px_50px_minmax(0,1fr)_minmax(0,1fr)_56px] gap-3 px-4 font-mono text-[16px] text-white/60">
              <span>#</span>
              <span />
              <span>Title</span>
              <span>Album</span>
              <span>Time</span>
            </div>
            <div className="font-mono text-[16px] text-white/60">Notes</div>
          </div>
          <div className="flex flex-col">
            {draft.length === 0 ? (
              <p className="px-2 font-mono text-white/40">no tracks yet</p>
            ) : (
              draft.map((note, index) => (
                <TrackRow
                  key={note.key}
                  note={note}
                  index={index}
                  editable={editable}
                  onNoteChange={(key, value) =>
                    setDraft((prev) =>
                      prev.map((n) =>
                        n.key === key ? { ...n, note: value } : n,
                      ),
                    )
                  }
                  onRemove={handleRemove}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {editable && dirty ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#121212]/95 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <p className="font-mono text-sm text-white/50">
              unsaved changes
              {pendingAdds.length > 0 ||
              draft.some((n) => n.markedForRemoval)
                ? " · will update Spotify on save"
                : ""}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={handleCancel}
                className="rounded px-4 py-2 font-mono text-sm text-white/60 hover:text-white disabled:opacity-40"
              >
                cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={handleSave}
                className="rounded-lg bg-[#1ed760] px-5 py-2 font-sans text-sm font-semibold text-black hover:brightness-110 disabled:opacity-40"
              >
                {pending ? "saving…" : "save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {leaveConfirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-dialog-title"
        >
          <div className="flex w-full max-w-md flex-col gap-6 rounded-lg border border-white/10 bg-[#121212] p-6">
            <div>
              <h3
                id="leave-dialog-title"
                className="font-mono text-[18px] text-white"
              >
                unsaved changes
              </h3>
              <p className="mt-2 font-mono text-sm text-white/50">
                Leave this playlist and discard your edits?
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setLeaveConfirmOpen(false)}
                className="rounded px-4 py-2 font-mono text-sm text-white/60 hover:text-white"
              >
                stay
              </button>
              <button
                type="button"
                onClick={confirmLeave}
                className="rounded-lg bg-white/10 px-4 py-2 font-sans text-sm font-semibold text-white hover:bg-white/20"
              >
                discard
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
