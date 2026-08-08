import { nanoid } from "nanoid";
import type { PlaylistAudioStats } from "./audio-features";
import { getDb } from "./db";
import type {
  AnnotatedPlaylist,
  TrackNote,
  TrackNoteStatus,
} from "./types";
import {
  Prisma,
  type AnnotatedPlaylist as DbPlaylist,
  type TrackNote as DbNote,
} from "@/generated/prisma/client";

type PlaylistRow = DbPlaylist & { notes: DbNote[] };

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function mapNote(note: DbNote): TrackNote {
  return {
    id: note.id,
    annotatedPlaylistId: note.annotatedPlaylistId,
    spotifyTrackId: note.spotifyTrackId,
    trackName: note.trackName,
    artistNames: note.artistNames,
    albumName: note.albumName,
    albumImageUrl: note.albumImageUrl,
    durationMs: note.durationMs,
    position: note.position,
    note: note.note,
    status: note.status as TrackNoteStatus,
    updatedAt: note.updatedAt.toISOString(),
  };
}

function mapPlaylist(row: PlaylistRow): AnnotatedPlaylist {
  return {
    id: row.id,
    userId: row.userId,
    spotifyPlaylistId: row.spotifyPlaylistId,
    title: row.title,
    description: row.description,
    creatorName: row.creatorName,
    shareSlug: row.shareSlug,
    coverImageUrl: row.coverImageUrl,
    lastSyncedAt: toIso(row.lastSyncedAt),
    createdAt: row.createdAt.toISOString(),
    audioStats: (row.audioStats as PlaylistAudioStats | null) ?? null,
    audioStatsUnavailable: row.audioStatsUnavailable,
    notes: [...row.notes]
      .sort((a, b) => a.position - b.position)
      .map(mapNote),
  };
}

const withNotes = { notes: true } as const;

export async function listPlaylistsByUser(
  userId: string,
): Promise<AnnotatedPlaylist[]> {
  const db = getDb();
  const rows = await db.annotatedPlaylist.findMany({
    where: { userId },
    include: withNotes,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapPlaylist);
}

export async function getPlaylistById(
  id: string,
): Promise<AnnotatedPlaylist | null> {
  const db = getDb();
  const row = await db.annotatedPlaylist.findUnique({
    where: { id },
    include: withNotes,
  });
  return row ? mapPlaylist(row) : null;
}

export async function getPlaylistBySlug(
  slug: string,
): Promise<AnnotatedPlaylist | null> {
  const db = getDb();
  const row = await db.annotatedPlaylist.findUnique({
    where: { shareSlug: slug },
    include: withNotes,
  });
  return row ? mapPlaylist(row) : null;
}

export async function createAnnotatedPlaylist(input: {
  userId: string;
  spotifyPlaylistId: string;
  title: string;
  creatorName?: string | null;
  coverImageUrl?: string | null;
  notes?: Omit<
    TrackNote,
    "id" | "annotatedPlaylistId" | "updatedAt"
  >[];
}): Promise<AnnotatedPlaylist> {
  const db = getDb();
  const id = nanoid();
  const now = new Date();

  const row = await db.annotatedPlaylist.create({
    data: {
      id,
      userId: input.userId,
      spotifyPlaylistId: input.spotifyPlaylistId,
      title: input.title,
      description: "",
      creatorName: input.creatorName?.trim() || "spots user",
      shareSlug: nanoid(12),
      coverImageUrl: input.coverImageUrl ?? null,
      lastSyncedAt: null,
      createdAt: now,
      audioStats: Prisma.DbNull,
      audioStatsUnavailable: false,
      notes: {
        create: (input.notes ?? []).map((note, index) => ({
          id: nanoid(),
          spotifyTrackId: note.spotifyTrackId,
          trackName: note.trackName,
          artistNames: note.artistNames,
          albumName: note.albumName,
          albumImageUrl: note.albumImageUrl,
          durationMs: note.durationMs,
          position: note.position ?? index,
          note: note.note,
          status: note.status,
          updatedAt: now,
        })),
      },
    },
    include: withNotes,
  });

  return mapPlaylist(row);
}

export async function savePlaylist(
  playlist: AnnotatedPlaylist,
): Promise<AnnotatedPlaylist> {
  const db = getDb();

  const row = await db.$transaction(async (tx) => {
    await tx.trackNote.deleteMany({
      where: { annotatedPlaylistId: playlist.id },
    });

    return tx.annotatedPlaylist.update({
      where: { id: playlist.id },
      data: {
        userId: playlist.userId,
        spotifyPlaylistId: playlist.spotifyPlaylistId,
        title: playlist.title,
        description: playlist.description,
        creatorName: playlist.creatorName,
        shareSlug: playlist.shareSlug,
        coverImageUrl: playlist.coverImageUrl,
        lastSyncedAt: playlist.lastSyncedAt
          ? new Date(playlist.lastSyncedAt)
          : null,
        audioStats:
          playlist.audioStats === null
            ? Prisma.DbNull
            : (playlist.audioStats as Prisma.InputJsonValue),
        audioStatsUnavailable: playlist.audioStatsUnavailable,
        notes: {
          create: playlist.notes.map((note) => ({
            id: note.id,
            spotifyTrackId: note.spotifyTrackId,
            trackName: note.trackName,
            artistNames: note.artistNames,
            albumName: note.albumName,
            albumImageUrl: note.albumImageUrl,
            durationMs: note.durationMs,
            position: note.position,
            note: note.note,
            status: note.status,
            updatedAt: new Date(note.updatedAt),
          })),
        },
      },
      include: withNotes,
    });
  });

  return mapPlaylist(row);
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

export async function updatePlaylistDescription(
  playlistId: string,
  userId: string,
  description: string,
): Promise<AnnotatedPlaylist> {
  const playlist = await getPlaylistById(playlistId);
  if (!playlist || playlist.userId !== userId) {
    throw new Error("Not found or unauthorized");
  }
  playlist.description = description;
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
  const db = getDb();
  const rows = await db.annotatedPlaylist.findMany({
    where: { userId, spotifyPlaylistId },
    include: withNotes,
  });
  return rows.map(mapPlaylist);
}
