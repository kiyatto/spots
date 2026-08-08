import { nanoid } from "nanoid";
import type { AnnotatedPlaylist, SpotifyTrack, TrackNote } from "./types";
import { savePlaylist } from "./store";
import { getPlaylistImageUrl, getPlaylistItems } from "./spotify";

function toNote(
  playlistId: string,
  track: SpotifyTrack,
  position: number,
  existing?: TrackNote,
): TrackNote {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? nanoid(),
    annotatedPlaylistId: playlistId,
    spotifyTrackId: track.id,
    trackName: track.name,
    artistNames: track.artists,
    albumName: track.albumName,
    albumImageUrl: track.albumImageUrl,
    durationMs: track.durationMs,
    position,
    note: existing?.note ?? "",
    status: "active",
    updatedAt: existing ? now : now,
  };
}

export async function syncPlaylistFromSpotify(
  playlist: AnnotatedPlaylist,
  accessToken: string,
): Promise<AnnotatedPlaylist> {
  const [spotifyTracks, playlistImageUrl] = await Promise.all([
    getPlaylistItems(accessToken, playlist.spotifyPlaylistId),
    getPlaylistImageUrl(accessToken, playlist.spotifyPlaylistId).catch(
      () => null,
    ),
  ]);
  const byId = new Map(playlist.notes.map((n) => [n.spotifyTrackId, n]));
  const seen = new Set<string>();
  const nextNotes: TrackNote[] = [];

  spotifyTracks.forEach((track, index) => {
    seen.add(track.id);
    const existing = byId.get(track.id);
    nextNotes.push(toNote(playlist.id, track, index, existing));
  });

  for (const note of playlist.notes) {
    if (!seen.has(note.spotifyTrackId)) {
      nextNotes.push({
        ...note,
        status: "removed_from_spotify",
        position: nextNotes.length,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  const updated: AnnotatedPlaylist = {
    ...playlist,
    notes: nextNotes,
    lastSyncedAt: new Date().toISOString(),
    coverImageUrl: playlistImageUrl ?? playlist.coverImageUrl,
  };

  return savePlaylist(updated);
}
