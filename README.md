# spots

Annotate Spotify playlists, keep multiple note variants per playlist, and share read-only links.


## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Auth.js (Spotify OAuth; optional demo mode)
- Temporary storage: `data/store.json` (Supabase planned, not wired yet)

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

### Demo mode (no Spotify app)

In `.env.local`:

```bash
AUTH_SECRET=any-long-random-string
AUTH_URL=http://localhost:3000
SPOTS_DEMO_MODE=true
```

Open [http://localhost:3000](http://localhost:3000) and use **continue in demo mode**.

### Spotify login

1. Create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Add redirect URI: `http://localhost:3000/api/auth/callback/spotify`
3. Set `AUTH_SPOTIFY_ID` and `AUTH_SPOTIFY_SECRET` in `.env.local`
4. Note: Development mode only allows allowlisted users

## Scripts

- `npm run dev` — local server
- `npm run build` — production build
- `npm run lint` — ESLint
