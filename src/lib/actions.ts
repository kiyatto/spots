"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { requireSession } from "./auth";
import {
  createAnnotatedPlaylist,
  getPlaylistById,
  listPlaylistsByUser,
  listSiblingPlaylists,
  replacePlaylistNotes,
  savePlaylist,
  updatePlaylistDescription,
  updatePlaylistTitle,
} from "./store";
import {
  addTracksToPlaylist,
  createPlaylist,
  listUserPlaylists,
  removeTracksFromPlaylist,
  searchTracks,
} from "./spotify";
import {
  isDemoToken,
  mockAddTracks,
  mockCreatePlaylist,
  mockGetPlaylistItems,
  mockListPlaylists,
  mockRemoveTracks,
  mockSearchTracks,
} from "./mock-spotify";
import { syncPlaylistFromSpotify } from "./sync";
import { nextUniqueTitle } from "./titles";
import type {
  AnnotatedPlaylist,
  PlaylistEditSaveInput,
  SpotifyTrack,
  TrackNote,
} from "./types";

async function accessToken() {
  const session = await requireSession();
  if (!session.accessToken) {
    throw new Error("Missing Spotify access token. Sign in again.");
  }
  if (session.error) {
    throw new Error("Spotify session expired. Sign in again.");
  }
  return { session, token: session.accessToken };
}

async function syncWithMock(playlistId: string): Promise<AnnotatedPlaylist> {
  const playlist = await getPlaylistById(playlistId);
  if (!playlist) throw new Error("Playlist not found");

  const tracks = await mockGetPlaylistItems(playlist.spotifyPlaylistId);
  const byId = new Map(playlist.notes.map((n) => [n.spotifyTrackId, n]));
  const seen = new Set<string>();
  const notes: TrackNote[] = tracks.map((track, index) => {
    seen.add(track.id);
    const existing = byId.get(track.id);
    return {
      id: existing?.id ?? nanoid(),
      annotatedPlaylistId: playlist.id,
      spotifyTrackId: track.id,
      trackName: track.name,
      artistNames: track.artists,
      albumName: track.albumName,
      albumImageUrl: track.albumImageUrl,
      durationMs: track.durationMs,
      position: index,
      note: existing?.note ?? "",
      status: "active",
      updatedAt: new Date().toISOString(),
    };
  });

  for (const note of playlist.notes) {
    if (!seen.has(note.spotifyTrackId)) {
      notes.push({
        ...note,
        status: "removed_from_spotify",
        position: notes.length,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return savePlaylist({
    ...playlist,
    notes,
    lastSyncedAt: new Date().toISOString(),
    coverImageUrl: tracks[0]?.albumImageUrl ?? playlist.coverImageUrl,
  });
}

async function syncOne(
  playlist: AnnotatedPlaylist,
  token: string,
): Promise<AnnotatedPlaylist> {
  if (isDemoToken(token)) {
    return syncWithMock(playlist.id);
  }
  return syncPlaylistFromSpotify(playlist, token);
}

export async function getMyAnnotatedPlaylists() {
  const session = await requireSession();
  return listPlaylistsByUser(session.user.id);
}

export async function getSpotifyPlaylistsAction() {
  const { token } = await accessToken();
  if (isDemoToken(token)) return mockListPlaylists();
  return listUserPlaylists(token);
}

export async function importSpotifyPlaylistAction(
  spotifyPlaylistId: string,
  title?: string,
) {
  const { session, token } = await accessToken();
  const playlists = isDemoToken(token)
    ? await mockListPlaylists()
    : await listUserPlaylists(token);
  const source = playlists.find((p) => p.id === spotifyPlaylistId);
  if (!source) throw new Error("Spotify playlist not found");

  const existing = await listPlaylistsByUser(session.user.id);
  const uniqueTitle = nextUniqueTitle(
    existing.map((p) => p.title),
    (title ?? source.name).trim() || source.name,
  );

  const created = await createAnnotatedPlaylist({
    userId: session.user.id,
    spotifyPlaylistId: source.id,
    title: uniqueTitle,
    creatorName: session.user.name,
    coverImageUrl: source.imageUrl,
  });

  const synced = await syncOne(created, token);
  revalidatePath("/dashboard");
  redirect(`/playlists/${synced.id}`);
}

export async function syncPlaylistAction(playlistId: string) {
  const { session, token } = await accessToken();
  const playlist = await getPlaylistById(playlistId);
  if (!playlist || playlist.userId !== session.user.id) {
    throw new Error("Not found or unauthorized");
  }

  const synced = await syncOne(playlist, token);

  const siblings = await listSiblingPlaylists(
    session.user.id,
    playlist.spotifyPlaylistId,
  );
  for (const sibling of siblings) {
    if (sibling.id === playlistId) continue;
    await syncOne(sibling, token);
  }

  revalidatePath(`/playlists/${playlistId}`);
  revalidatePath("/dashboard");
  return synced;
}

export async function createSpotifyPlaylistAction(formData: FormData) {
  const { session, token } = await accessToken();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Playlist name is required");

  const created = isDemoToken(token)
    ? await mockCreatePlaylist(name)
    : await createPlaylist(token, name);

  const existing = await listPlaylistsByUser(session.user.id);
  const uniqueTitle = nextUniqueTitle(
    existing.map((p) => p.title),
    created.name,
  );

  const annotated = await createAnnotatedPlaylist({
    userId: session.user.id,
    spotifyPlaylistId: created.id,
    title: uniqueTitle,
    creatorName: session.user.name,
    coverImageUrl: created.images?.[0]?.url ?? "/assets/mascot.png",
  });

  revalidatePath("/dashboard");
  redirect(`/playlists/${annotated.id}`);
}

export async function renamePlaylistAction(playlistId: string, title: string) {
  const session = await requireSession();
  const playlist = await getPlaylistById(playlistId);
  if (!playlist || playlist.userId !== session.user.id) {
    throw new Error("Not found or unauthorized");
  }

  const existing = await listPlaylistsByUser(session.user.id);
  const uniqueTitle = nextUniqueTitle(
    existing.map((p) => p.title),
    title.trim() || playlist.title,
    { excludeTitle: playlist.title },
  );

  await updatePlaylistTitle(playlistId, session.user.id, uniqueTitle);
  revalidatePath(`/playlists/${playlistId}`);
  revalidatePath("/dashboard");
  return uniqueTitle;
}

export async function updatePlaylistDescriptionAction(
  playlistId: string,
  description: string,
) {
  const session = await requireSession();
  const playlist = await getPlaylistById(playlistId);
  if (!playlist || playlist.userId !== session.user.id) {
    throw new Error("Not found or unauthorized");
  }

  const next = description.trim();
  await updatePlaylistDescription(playlistId, session.user.id, next);
  revalidatePath(`/playlists/${playlistId}`);
  if (playlist.shareSlug) {
    revalidatePath(`/p/${playlist.shareSlug}`);
  }
  return next;
}

export async function searchTracksAction(query: string) {
  const { token } = await accessToken();
  if (isDemoToken(token)) return mockSearchTracks(query);
  return searchTracks(token, query);
}

/**
 * Commits draft edits: mutates Spotify (add/remove), then persists notes
 * via the store layer (JSON today; swap to Postgres/Supabase later).
 */
export async function savePlaylistEditsAction(input: PlaylistEditSaveInput) {
  const { session, token } = await accessToken();
  const playlist = await getPlaylistById(input.playlistId);
  if (!playlist || playlist.userId !== session.user.id) {
    throw new Error("Not found or unauthorized");
  }

  const addTracks = input.addTracks ?? [];
  const removeIds = [...new Set(input.removeSpotifyTrackIds ?? [])];

  if (addTracks.length > 0) {
    if (isDemoToken(token)) {
      await mockAddTracks(playlist.spotifyPlaylistId, addTracks);
    } else {
      await addTracksToPlaylist(
        token,
        playlist.spotifyPlaylistId,
        addTracks.map((t) => t.uri),
      );
    }
  }

  if (removeIds.length > 0) {
    if (isDemoToken(token)) {
      await mockRemoveTracks(playlist.spotifyPlaylistId, removeIds);
    } else {
      await removeTracksFromPlaylist(
        token,
        playlist.spotifyPlaylistId,
        removeIds.map((id) => `spotify:track:${id}`),
      );
    }
  }

  const saved = await replacePlaylistNotes(
    input.playlistId,
    session.user.id,
    input.notes,
  );

  // Reconcile siblings' track lists after Spotify mutation
  if (addTracks.length > 0 || removeIds.length > 0) {
    const siblings = await listSiblingPlaylists(
      session.user.id,
      playlist.spotifyPlaylistId,
    );
    for (const sibling of siblings) {
      if (sibling.id === playlist.id) continue;
      await syncOne(sibling, token);
    }
  }

  revalidatePath(`/playlists/${input.playlistId}`);
  revalidatePath("/dashboard");
  revalidatePath(`/p/${saved.shareSlug}`);
  return saved;
}

export async function loadOwnerPlaylist(playlistId: string) {
  const { session, token } = await accessToken();
  const playlist = await getPlaylistById(playlistId);
  if (!playlist || playlist.userId !== session.user.id) {
    return null;
  }

  try {
    return await syncOne(playlist, token);
  } catch {
    return playlist;
  }
}
