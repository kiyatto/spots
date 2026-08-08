"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
import { averageFeatures } from "./audio-features";
import {
  addTracksToPlaylist,
  createPlaylist,
  getTracksAudioFeatures,
  listUserPlaylists,
  removeTracksFromPlaylist,
  searchTracks,
} from "./spotify";
import { syncPlaylistFromSpotify } from "./sync";
import { nextUniqueTitle } from "./titles";
import type { AnnotatedPlaylist, PlaylistEditSaveInput } from "./types";

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

function activeTrackIds(playlist: AnnotatedPlaylist) {
  return playlist.notes
    .filter((n) => n.status === "active")
    .map((n) => n.spotifyTrackId);
}

async function withAudioStats(
  playlist: AnnotatedPlaylist,
  token: string,
): Promise<AnnotatedPlaylist> {
  const ids = activeTrackIds(playlist);
  if (ids.length === 0) {
    return savePlaylist({
      ...playlist,
      audioStats: null,
      audioStatsUnavailable: false,
    });
  }

  try {
    const features = await getTracksAudioFeatures(token, ids);
    if (features.length === 0) {
      return savePlaylist({
        ...playlist,
        audioStats: null,
        audioStatsUnavailable: true,
      });
    }
    return savePlaylist({
      ...playlist,
      audioStats: averageFeatures(features),
      audioStatsUnavailable: false,
    });
  } catch {
    return savePlaylist({
      ...playlist,
      audioStats: null,
      audioStatsUnavailable: true,
    });
  }
}

export async function getMyAnnotatedPlaylists() {
  const session = await requireSession();
  return listPlaylistsByUser(session.user.id);
}

export async function getSpotifyPlaylistsAction() {
  const { token } = await accessToken();
  return listUserPlaylists(token);
}

export async function importSpotifyPlaylistAction(
  spotifyPlaylistId: string,
  title?: string,
) {
  const { session, token } = await accessToken();
  const playlists = await listUserPlaylists(token);
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

  const synced = await syncPlaylistFromSpotify(created, token);
  revalidatePath("/dashboard");
  redirect(`/playlists/${synced.id}`);
}

export async function syncPlaylistAction(playlistId: string) {
  const { session, token } = await accessToken();
  const playlist = await getPlaylistById(playlistId);
  if (!playlist || playlist.userId !== session.user.id) {
    throw new Error("Not found or unauthorized");
  }

  const synced = await syncPlaylistFromSpotify(playlist, token);

  const siblings = await listSiblingPlaylists(
    session.user.id,
    playlist.spotifyPlaylistId,
  );
  for (const sibling of siblings) {
    if (sibling.id === playlistId) continue;
    await syncPlaylistFromSpotify(sibling, token);
  }

  revalidatePath(`/playlists/${playlistId}`);
  revalidatePath("/dashboard");
  return synced;
}

export async function createSpotifyPlaylistAction(formData: FormData) {
  const { session, token } = await accessToken();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Playlist name is required");

  const created = await createPlaylist(token, name);

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
  return searchTracks(token, query);
}

/**
 * Commits draft edits: mutates Spotify (add/remove), then persists notes
 * via the Prisma/Postgres store layer.
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
    await addTracksToPlaylist(
      token,
      playlist.spotifyPlaylistId,
      addTracks.map((t) => t.uri),
    );
  }

  if (removeIds.length > 0) {
    await removeTracksFromPlaylist(
      token,
      playlist.spotifyPlaylistId,
      removeIds.map((id) => `spotify:track:${id}`),
    );
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
      await syncPlaylistFromSpotify(sibling, token);
    }
  }

  const withStats = await withAudioStats(saved, token);

  revalidatePath(`/playlists/${input.playlistId}`);
  revalidatePath("/dashboard");
  revalidatePath(`/p/${withStats.shareSlug}`);
  return withStats;
}

export async function loadOwnerPlaylist(playlistId: string) {
  const { session, token } = await accessToken();
  const playlist = await getPlaylistById(playlistId);
  if (!playlist || playlist.userId !== session.user.id) {
    return null;
  }

  try {
    const synced = await syncPlaylistFromSpotify(playlist, token);
    return await withAudioStats(synced, token);
  } catch {
    try {
      return await withAudioStats(playlist, token);
    } catch {
      return playlist;
    }
  }
}
