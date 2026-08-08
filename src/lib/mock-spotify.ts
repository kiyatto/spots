import type { SpotifyPlaylistSummary, SpotifyTrack } from "./types";

const MOCK_TRACKS: SpotifyTrack[] = [
  {
    id: "mock-track-1",
    name: "Someday",
    artists: "The Strokes",
    albumName: "Is This It",
    albumImageUrl: "/assets/mascot.png",
    durationMs: 183000,
    uri: "spotify:track:mock-track-1",
  },
  {
    id: "mock-track-2",
    name: "Last Nite",
    artists: "The Strokes",
    albumName: "Is This It",
    albumImageUrl: "/assets/mascot.png",
    durationMs: 197000,
    uri: "spotify:track:mock-track-2",
  },
  {
    id: "mock-track-3",
    name: "Reptilia",
    artists: "The Strokes",
    albumName: "Room on Fire",
    albumImageUrl: "/assets/mascot.png",
    durationMs: 219000,
    uri: "spotify:track:mock-track-3",
  },
];

const mockPlaylists: SpotifyPlaylistSummary[] = [
  {
    id: "mock-playlist-1",
    name: "late night drive",
    imageUrl: "/assets/mascot.png",
    trackCount: 3,
    ownerId: "demo-spotify",
  },
  {
    id: "mock-playlist-2",
    name: "sunday laundry",
    imageUrl: "/assets/mascot.png",
    trackCount: 2,
    ownerId: "demo-spotify",
  },
];

const playlistTracks = new Map<string, SpotifyTrack[]>([
  ["mock-playlist-1", [...MOCK_TRACKS]],
  ["mock-playlist-2", MOCK_TRACKS.slice(0, 2)],
]);

export function isDemoToken(accessToken?: string | null): boolean {
  return accessToken === "demo-token";
}

export async function mockListPlaylists(): Promise<SpotifyPlaylistSummary[]> {
  return mockPlaylists.map((p) => ({
    ...p,
    trackCount: playlistTracks.get(p.id)?.length ?? 0,
  }));
}

export async function mockGetPlaylistItems(
  playlistId: string,
): Promise<SpotifyTrack[]> {
  return [...(playlistTracks.get(playlistId) ?? [])];
}

export async function mockGetPlaylistImageUrl(
  playlistId: string,
): Promise<string | null> {
  return mockPlaylists.find((p) => p.id === playlistId)?.imageUrl ?? null;
}

export async function mockCreatePlaylist(
  name: string,
): Promise<{ id: string; name: string; images: { url: string }[] }> {
  const id = `mock-playlist-${Date.now()}`;
  mockPlaylists.push({
    id,
    name,
    imageUrl: "/assets/mascot.png",
    trackCount: 0,
    ownerId: "demo-spotify",
  });
  playlistTracks.set(id, []);
  return { id, name, images: [{ url: "/assets/mascot.png" }] };
}

export async function mockAddTracks(
  playlistId: string,
  tracks: SpotifyTrack[],
): Promise<void> {
  const existing = playlistTracks.get(playlistId) ?? [];
  const ids = new Set(existing.map((t) => t.id));
  for (const track of tracks) {
    if (!ids.has(track.id)) existing.push(track);
  }
  playlistTracks.set(playlistId, existing);
}

export async function mockRemoveTracks(
  playlistId: string,
  trackIds: string[],
): Promise<void> {
  const remove = new Set(trackIds);
  const existing = playlistTracks.get(playlistId) ?? [];
  playlistTracks.set(
    playlistId,
    existing.filter((t) => !remove.has(t.id)),
  );
}

export async function mockSearchTracks(query: string): Promise<SpotifyTrack[]> {
  const q = query.toLowerCase();
  const catalog = [
    ...MOCK_TRACKS,
    {
      id: "mock-track-4",
      name: "Hard To Explain",
      artists: "The Strokes",
      albumName: "Is This It",
      albumImageUrl: "/assets/mascot.png",
      durationMs: 221000,
      uri: "spotify:track:mock-track-4",
    },
  ];
  return catalog.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.artists.toLowerCase().includes(q) ||
      t.albumName.toLowerCase().includes(q),
  );
}
