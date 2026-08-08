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

export function averageFeatures(
  features: TrackAudioFeatures[],
): PlaylistAudioStats | null {
  if (features.length === 0) return null;

  const totals: TrackAudioFeatures = {
    acousticness: 0,
    energy: 0,
    mode: 0,
    valence: 0,
    danceability: 0,
    loudness: 0,
    tempo: 0,
  };

  for (const f of features) {
    totals.acousticness += f.acousticness;
    totals.energy += f.energy;
    totals.mode += f.mode;
    totals.valence += f.valence;
    totals.danceability += f.danceability;
    totals.loudness += f.loudness;
    totals.tempo += f.tempo;
  }

  const n = features.length;
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

export const AUDIO_FEATURES_UNAVAILABLE_MESSAGE =
  "Cannot display audio features for this playlist.";
