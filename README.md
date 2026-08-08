# spots

Annotate Spotify playlists, keep multiple note variants per playlist, and share read-only links.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Auth.js (Spotify OAuth)
- Supabase Postgres via Prisma

## Setup

1. Link the Vercel project and pull env vars (includes Supabase Postgres URLs):

```bash
npx vercel link
npx vercel env pull .env.local --yes
```

2. Ensure Spotify credentials are in `.env.local` (`AUTH_SECRET`, `AUTH_URL`, `AUTH_SPOTIFY_ID`, `AUTH_SPOTIFY_SECRET`).

3. Install, push schema, run:

```bash
npm install
npm run db:push
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) and log in with Spotify.

### Spotify app

1. Create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Add redirect URI: `http://127.0.0.1:3000/api/auth/callback/spotify`
3. Set `AUTH_SPOTIFY_ID` and `AUTH_SPOTIFY_SECRET` in `.env.local`
4. Development mode only allows allowlisted users

## Scripts

- `npm run dev` — local server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run db:push` — sync Prisma schema to Postgres
- `npm run db:generate` — regenerate Prisma Client
