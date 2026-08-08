export type TrackNoteStatus = "active" | "removed_from_spotify";

export type TrackNote = {
  id: string;
  annotatedPlaylistId: string;
  spotifyTrackId: string;
  trackName: string;
  artistNames: string;
  albumName: string;
  albumImageUrl: string | null;
  durationMs: number;
  position: number;
  note: string;
  status: TrackNoteStatus;
  updatedAt: string;
};

export type AnnotatedPlaylist = {
  id: string;
  userId: string;
  spotifyPlaylistId: string;
  title: string;
  description: string;
  creatorName: string;
  shareSlug: string;
  coverImageUrl: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  notes: TrackNote[];
};

export type DataStore = {
  playlists: AnnotatedPlaylist[];
};

export type SpotifyPlaylistSummary = {
  id: string;
  name: string;
  imageUrl: string | null;
  trackCount: number;
  ownerId: string;
};

export type SpotifyTrack = {
  id: string;
  name: string;
  artists: string;
  albumName: string;
  albumImageUrl: string | null;
  durationMs: number;
  uri: string;
};

/** Client draft payload committed by savePlaylistEditsAction */
export type PlaylistEditSaveInput = {
  playlistId: string;
  notes: Array<{
    spotifyTrackId: string;
    trackName: string;
    artistNames: string;
    albumName: string;
    albumImageUrl: string | null;
    durationMs: number;
    note: string;
    status: TrackNoteStatus;
  }>;
  addTracks: SpotifyTrack[];
  removeSpotifyTrackIds: string[];
};
