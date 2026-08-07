import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import type {
  AnnotatedPlaylist,
  DataStore,
  TrackNote,
  TrackNoteStatus,
} from "./types";


const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

const emptyStore = (): DataStore => ({ playlists: [] });

async function ensureStore(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify(emptyStore(), null, 2));
  }
}

async function readStore(): Promise<DataStore> {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, "utf8");
  try {
    return JSON.parse(raw) as DataStore;
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: DataStore): Promise<void> {
  await ensureStore();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

export async function listPlaylistsByUser(
  userId: string,
): Promise<AnnotatedPlaylist[]> {
  const store = await readStore();
  return store.playlists
    .filter((p) => p.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getPlaylistById(
  id: string,
): Promise<AnnotatedPlaylist | null> {
  const store = await readStore();
  return store.playlists.find((p) => p.id === id) ?? null;
}

export async function getPlaylistBySlug(
  slug: string,
): Promise<AnnotatedPlaylist | null> {
  const store = await readStore();
  return store.playlists.find((p) => p.shareSlug === slug) ?? null;
}

export async function createAnnotatedPlaylist(input: {
  userId: string;
  spotifyPlaylistId: string;
  title: string;
  coverImageUrl?: string | null;
  notes?: Omit<
    TrackNote,
    "id" | "annotatedPlaylistId" | "updatedAt"
  >[];
}): Promise<AnnotatedPlaylist> {
  const store = await readStore();
  const id = nanoid();
  const now = new Date().toISOString();
  const playlist: AnnotatedPlaylist = {
    id,
    userId: input.userId,
    spotifyPlaylistId: input.spotifyPlaylistId,
    title: input.title,
    shareSlug: nanoid(12),
    coverImageUrl: input.coverImageUrl ?? null,
    lastSyncedAt: null,
    createdAt: now,
    notes: (input.notes ?? []).map((note, index) => ({
      ...note,
      id: nanoid(),
      annotatedPlaylistId: id,
      position: note.position ?? index,
      updatedAt: now,
    })),
  };
  store.playlists.push(playlist);
  await writeStore(store);
  return playlist;
}

export async function savePlaylist(
  playlist: AnnotatedPlaylist,
): Promise<AnnotatedPlaylist> {
  const store = await readStore();
  const index = store.playlists.findIndex((p) => p.id === playlist.id);
  if (index === -1) {
    throw new Error("Playlist not found");
  }
  store.playlists[index] = playlist;
  await writeStore(store);
  return playlist;
}

export async function updatePlaylistTitle(
  playlistId: string,
  userId: string,
  title: string,
): Promise<AnnotatedPlaylist> {
  const playlist = await getPlaylistById(playlistId);
  if (!playlist || playlist.userId !== userId) {
    throw new Error("Not found or unauthorized");
  }
  playlist.title = title;
  return savePlaylist(playlist);
}

export async function replacePlaylistNotes(
  playlistId: string,
  userId: string,
  noteInputs: Array<{
    spotifyTrackId: string;
    trackName: string;
    artistNames: string;
    albumName: string;
    albumImageUrl: string | null;
    durationMs: number;
    note: string;
    status: TrackNoteStatus;
  }>,
): Promise<AnnotatedPlaylist> {
  const playlist = await getPlaylistById(playlistId);
  if (!playlist || playlist.userId !== userId) {
    throw new Error("Not found or unauthorized");
  }

  const now = new Date().toISOString();
  const byTrackId = new Map(
    playlist.notes.map((n) => [n.spotifyTrackId, n] as const),
  );

  playlist.notes = noteInputs.map((input, position) => {
    const existing = byTrackId.get(input.spotifyTrackId);
    return {
      id: existing?.id ?? nanoid(),
      annotatedPlaylistId: playlistId,
      spotifyTrackId: input.spotifyTrackId,
      trackName: input.trackName,
      artistNames: input.artistNames,
      albumName: input.albumName,
      albumImageUrl: input.albumImageUrl,
      durationMs: input.durationMs,
      position,
      note: input.note,
      status: input.status,
      updatedAt: now,
    };
  });

  return savePlaylist(playlist);
}

export async function listSiblingPlaylists(
  userId: string,
  spotifyPlaylistId: string,
): Promise<AnnotatedPlaylist[]> {
  const store = await readStore();
  return store.playlists.filter(
    (p) => p.userId === userId && p.spotifyPlaylistId === spotifyPlaylistId,
  );
}
