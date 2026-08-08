import type { TrackAudioFeatures } from "./audio-features";
import type { SpotifyPlaylistSummary, SpotifyTrack } from "./types";

const API = "https://api.spotify.com/v1";

export class SpotifyApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function spotifyFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    // Always hit Spotify live — dashboard and sync must not reuse cached pages.
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new SpotifyApiError(
      `Spotify ${res.status}: ${body || res.statusText}`,
      res.status,
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

type SpotifyImage = { url: string };
type SpotifyArtist = { name: string };

type RawTrack = {
  id: string;
  name: string;
  duration_ms: number;
  uri: string;
  artists: SpotifyArtist[];
  album: { name: string; images: SpotifyImage[] };
};

function mapTrack(track: RawTrack): SpotifyTrack {
  return {
    id: track.id,
    name: track.name,
    artists: track.artists.map((a) => a.name).join(", "),
    albumName: track.album.name,
    albumImageUrl: track.album.images[0]?.url ?? null,
    durationMs: track.duration_ms,
    uri: track.uri,
  };
}

async function getPlaylistItemsVia(
  accessToken: string,
  playlistId: string,
  pathSuffix: "items" | "tracks",
): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = [];
  const limit = 50;
  let offset = 0;

  for (;;) {
    const page: {
      items: Array<{
        track?: RawTrack | null;
        item?: RawTrack | null;
      }>;
      total?: number;
    } = await spotifyFetch(
      accessToken,
      `/playlists/${playlistId}/${pathSuffix}?limit=${limit}&offset=${offset}`,
    );

    const entries = page.items ?? [];
    for (const entry of entries) {
      // Feb 2026 Dev Mode: playlist rows use `item`; older shape used `track`.
      const track = entry.item ?? entry.track;
      if (track?.id) {
        tracks.push(mapTrack(track));
      }
    }

    offset += entries.length;
    if (entries.length < limit) break;
    if (page.total != null && offset >= page.total) break;
  }

  return tracks;
}

export async function getCurrentUser(accessToken: string) {
  return spotifyFetch<{ id: string; display_name: string | null }>(
    accessToken,
    "/me",
  );
}

export async function listUserPlaylists(
  accessToken: string,
): Promise<SpotifyPlaylistSummary[]> {
  const playlists: SpotifyPlaylistSummary[] = [];
  const limit = 50;
  let offset = 0;

  for (;;) {
    // Paginate with /me/playlists?offset=… — Spotify's `next` URL still points
    // at the removed GET /users/{id}/playlists endpoint (403).
    const page: {
      items: Array<{
        id: string;
        name: string;
        images: SpotifyImage[] | null;
        // Pre–Feb 2026: tracks.total. Dev Mode may expose items.total or neither.
        tracks?: { total?: number } | null;
        items?: { total?: number } | null;
        owner: { id: string };
      }>;
      total?: number;
    } = await spotifyFetch(
      accessToken,
      `/me/playlists?limit=${limit}&offset=${offset}`,
    );

    const entries = page.items ?? [];
    for (const item of entries) {
      playlists.push({
        id: item.id,
        name: item.name,
        imageUrl: item.images?.[0]?.url ?? null,
        trackCount: item.items?.total ?? item.tracks?.total ?? 0,
        ownerId: item.owner.id,
      });
    }

    offset += entries.length;
    if (entries.length < limit) break;
    if (page.total != null && offset >= page.total) break;
  }

  return playlists;
}

export async function getPlaylistItems(
  accessToken: string,
  playlistId: string,
): Promise<SpotifyTrack[]> {
  try {
    return await getPlaylistItemsVia(accessToken, playlistId, "items");
  } catch (error) {
    if (error instanceof SpotifyApiError && error.status === 404) {
      return getPlaylistItemsVia(accessToken, playlistId, "tracks");
    }
    throw error;
  }
}

/** Playlist cover from Spotify (custom art or Spotify mosaic), not track album art. */
export async function getPlaylistImageUrl(
  accessToken: string,
  playlistId: string,
): Promise<string | null> {
  const playlist = await spotifyFetch<{
    images: SpotifyImage[] | null;
  }>(accessToken, `/playlists/${playlistId}?fields=images`);
  return playlist.images?.[0]?.url ?? null;
}

export async function createPlaylist(
  accessToken: string,
  name: string,
): Promise<{ id: string; name: string; images: { url: string }[] }> {
  // POST /users/{id}/playlists was removed in Feb 2026 Dev Mode.
  return spotifyFetch(accessToken, `/me/playlists`, {
    method: "POST",
    body: JSON.stringify({
      name,
      public: false,
      description: "Created with spots",
    }),
  });
}

export async function addTracksToPlaylist(
  accessToken: string,
  playlistId: string,
  uris: string[],
): Promise<void> {
  if (uris.length === 0) return;
  try {
    await spotifyFetch(accessToken, `/playlists/${playlistId}/items`, {
      method: "POST",
      body: JSON.stringify({ uris }),
    });
  } catch (error) {
    if (
      error instanceof SpotifyApiError &&
      (error.status === 404 || error.status === 400)
    ) {
      await spotifyFetch(accessToken, `/playlists/${playlistId}/tracks`, {
        method: "POST",
        body: JSON.stringify({ uris }),
      });
      return;
    }
    throw error;
  }
}

export async function removeTracksFromPlaylist(
  accessToken: string,
  playlistId: string,
  uris: string[],
): Promise<void> {
  if (uris.length === 0) return;
  const body = {
    items: uris.map((uri) => ({ uri })),
    tracks: uris.map((uri) => ({ uri })),
  };
  try {
    await spotifyFetch(accessToken, `/playlists/${playlistId}/items`, {
      method: "DELETE",
      body: JSON.stringify({ items: body.items }),
    });
  } catch (error) {
    if (
      error instanceof SpotifyApiError &&
      (error.status === 404 || error.status === 400)
    ) {
      await spotifyFetch(accessToken, `/playlists/${playlistId}/tracks`, {
        method: "DELETE",
        body: JSON.stringify({ tracks: body.tracks }),
      });
      return;
    }
    throw error;
  }
}

export async function searchTracks(
  accessToken: string,
  query: string,
): Promise<SpotifyTrack[]> {
  if (!query.trim()) return [];
  const limit = 10;
  const page = await spotifyFetch<{
    tracks: { items: RawTrack[] };
  }>(
    accessToken,
    `/search?type=track&limit=${limit}&q=${encodeURIComponent(query)}`,
  );
  return page.tracks.items.filter(Boolean).map(mapTrack);
}

type RawAudioFeatures = {
  id: string;
  acousticness: number;
  energy: number;
  mode: number;
  valence: number;
  danceability: number;
  loudness: number;
  tempo: number;
} | null;

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/** Map Spotify feature units onto a shared 0–1 scale for UI averages. */
function normalizeAudioFeatures(raw: RawAudioFeatures): TrackAudioFeatures | null {
  if (!raw) return null;
  return {
    acousticness: clamp01(raw.acousticness),
    energy: clamp01(raw.energy),
    mode: raw.mode ? 1 : 0,
    valence: clamp01(raw.valence),
    danceability: clamp01(raw.danceability),
    // Spotify loudness is typically about -60dB…0dB
    loudness: clamp01((raw.loudness + 60) / 60),
    // Rough BPM band for display scaling
    tempo: clamp01((raw.tempo - 50) / 150),
  };
}

export async function getTracksAudioFeatures(
  accessToken: string,
  trackIds: string[],
): Promise<TrackAudioFeatures[]> {
  const unique = [...new Set(trackIds.filter(Boolean))];
  if (unique.length === 0) return [];

  const features: TrackAudioFeatures[] = [];
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    const page = await spotifyFetch<{ audio_features: RawAudioFeatures[] }>(
      accessToken,
      `/audio-features?ids=${chunk.join(",")}`,
    );
    for (const raw of page.audio_features ?? []) {
      const normalized = normalizeAudioFeatures(raw);
      if (normalized) features.push(normalized);
    }
  }
  return features;
}

export function spotifyPlaylistUrl(spotifyPlaylistId: string) {
  return `https://open.spotify.com/playlist/${spotifyPlaylistId}`;
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}> {
  const clientId = process.env.AUTH_SPOTIFY_ID;
  const clientSecret = process.env.AUTH_SPOTIFY_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing Spotify credentials");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new SpotifyApiError("Failed to refresh Spotify token", res.status);
  }

  return res.json();
}
