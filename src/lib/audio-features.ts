export type TrackAudioFeatures = {
  acousticness: number;
  energy: number;
  mode: number;
  valence: number;
  danceability: number;
  loudness: number;
  tempo: number;
};

export type PlaylistAudioStats = TrackAudioFeatures;

/** Spotify-like 0–1 features (loudness/tempo normalized for display). */
const MOCK_FEATURES: Record<string, TrackAudioFeatures> = {
  "mock-track-1": {
    acousticness: 0.18,
    energy: 0.92,
    mode: 1,
    valence: 0.95,
    danceability: 0.78,
    loudness: 0.72,
    tempo: 0.7,
  },
  "mock-track-2": {
    acousticness: 0.25,
    energy: 0.85,
    mode: 1,
    valence: 0.9,
    danceability: 0.82,
    loudness: 0.78,
    tempo: 0.65,
  },
  "mock-track-3": {
    acousticness: 0.26,
    energy: 0.84,
    mode: 0,
    valence: 0.94,
    danceability: 0.8,
    loudness: 0.75,
    tempo: 0.69,
  },
  "mock-track-4": {
    acousticness: 0.3,
    energy: 0.8,
    mode: 1,
    valence: 0.88,
    danceability: 0.76,
    loudness: 0.7,
    tempo: 0.72,
  },
};

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic 0–1 feature when a track has no explicit mock data. */
function syntheticFeatures(trackId: string): TrackAudioFeatures {
  const unit = (salt: string) => (hashString(`${trackId}:${salt}`) % 1000) / 1000;
  return {
    acousticness: unit("acousticness"),
    energy: unit("energy"),
    mode: hashString(`${trackId}:mode`) % 2,
    valence: unit("valence"),
    danceability: unit("danceability"),
    loudness: unit("loudness"),
    tempo: unit("tempo"),
  };
}

export function getTrackFeatures(trackId: string): TrackAudioFeatures {
  return MOCK_FEATURES[trackId] ?? syntheticFeatures(trackId);
}

export function averageTrackFeatures(
  trackIds: string[],
): PlaylistAudioStats | null {
  if (trackIds.length === 0) return null;

  const totals: TrackAudioFeatures = {
    acousticness: 0,
    energy: 0,
    mode: 0,
    valence: 0,
    danceability: 0,
    loudness: 0,
    tempo: 0,
  };

  for (const id of trackIds) {
    const f = getTrackFeatures(id);
    totals.acousticness += f.acousticness;
    totals.energy += f.energy;
    totals.mode += f.mode;
    totals.valence += f.valence;
    totals.danceability += f.danceability;
    totals.loudness += f.loudness;
    totals.tempo += f.tempo;
  }

  const n = trackIds.length;
  return {
    acousticness: totals.acousticness / n,
    energy: totals.energy / n,
    mode: totals.mode / n,
    valence: totals.valence / n,
    danceability: totals.danceability / n,
    loudness: totals.loudness / n,
    tempo: totals.tempo / n,
  };
}

export const PLAYLIST_STAT_ROWS = [
  { key: "acousticness", label: "acousticness", scale: 10, digits: 1 },
  { key: "energy", label: "energy", scale: 10, digits: 1 },
  { key: "mode", label: "mode", scale: 1, digits: 2 },
  { key: "valence", label: "valence", scale: 10, digits: 1 },
  { key: "danceability", label: "danceability", scale: 10, digits: 1 },
  { key: "loudness", label: "loudness", scale: 10, digits: 1 },
  { key: "tempo", label: "tempo", scale: 10, digits: 1 },
] as const satisfies ReadonlyArray<{
  key: keyof TrackAudioFeatures;
  label: string;
  scale: number;
  digits: number;
}>;

export function formatStatValue(
  value: number,
  scale: number,
  digits: number,
): string {
  return (value * scale).toFixed(digits);
}
