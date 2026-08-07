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
  let url: string | null =
    `/playlists/${playlistId}/${pathSuffix}?limit=50&fields=items(track(id,name,duration_ms,uri,artists(name),album(name,images))),next`;

  while (url) {
    const page: {
      items: Array<{ track: RawTrack | null }>;
      next: string | null;
    } = await spotifyFetch(accessToken, url);

    for (const item of page.items) {
      if (item.track?.id) {
        tracks.push(mapTrack(item.track));
      }
    }

    if (page.next) {
      const nextUrl: URL = new URL(page.next);
      url = `${nextUrl.pathname.replace("/v1", "")}${nextUrl.search}`;
    } else {
      url = null;
    }
  }

  return tracks;
}

export async function getCurrentUser(
  accessToken: string,
): Promise<{ id: string; display_name: string | null }> {
  return spotifyFetch(accessToken, "/me");
}

export async function listUserPlaylists(
  accessToken: string,
): Promise<SpotifyPlaylistSummary[]> {
  const playlists: SpotifyPlaylistSummary[] = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const page = await spotifyFetch<{
      items: Array<{
        id: string;
        name: string;
        images: SpotifyImage[];
        tracks: { total: number };
        owner: { id: string };
      }>;
      total: number;
    }>(accessToken, `/me/playlists?limit=50&offset=${offset}`);

    total = page.total;
    offset += page.items.length;

    for (const item of page.items) {
      playlists.push({
        id: item.id,
        name: item.name,
        imageUrl: item.images[0]?.url ?? null,
        trackCount: item.tracks.total,
        ownerId: item.owner.id,
      });
    }

    if (page.items.length === 0) break;
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

export async function createPlaylist(
  accessToken: string,
  name: string,
  description?: string,
): Promise<{ id: string; name: string; images: SpotifyImage[] }> {
  return spotifyFetch(accessToken, "/me/playlists", {
    method: "POST",
    body: JSON.stringify({
      name,
      description: description ?? "Created with Spots",
      public: false,
    }),
  });
}

export async function addTracksToPlaylist(
  accessToken: string,
  playlistId: string,
  uris: string[],
): Promise<void> {
  try {
    await spotifyFetch(accessToken, `/playlists/${playlistId}/items`, {
      method: "POST",
      body: JSON.stringify({ uris }),
    });
  } catch (error) {
    if (error instanceof SpotifyApiError && error.status === 404) {
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
    if (error instanceof SpotifyApiError && (error.status === 404 || error.status === 400)) {
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
