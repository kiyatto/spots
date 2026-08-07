import NextAuth from "next-auth";
import Spotify from "next-auth/providers/spotify";
import Credentials from "next-auth/providers/credentials";
import { refreshAccessToken } from "./spotify";

const SPOTIFY_SCOPES = [
  "user-read-email",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
].join(" ");

const demoMode = process.env.SPOTS_DEMO_MODE === "true";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      spotifyId?: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    spotifyId?: string;
    error?: string;
    isDemo?: boolean;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    ...(process.env.AUTH_SPOTIFY_ID && process.env.AUTH_SPOTIFY_SECRET
      ? [
          Spotify({
            clientId: process.env.AUTH_SPOTIFY_ID,
            clientSecret: process.env.AUTH_SPOTIFY_SECRET,
            authorization: {
              url: "https://accounts.spotify.com/authorize",
              params: { scope: SPOTIFY_SCOPES },
            },
          }),
        ]
      : []),
    ...(demoMode
      ? [
          Credentials({
            id: "demo",
            name: "Demo",
            credentials: {
              // Auth.js expects a credentials shape; value is unused
              intent: { label: "intent", type: "text" },
            },
            async authorize() {
              return {
                id: "demo-user",
                name: "Demo",
                email: "demo@spots.local",
                image: "/assets/mascot.png",
              };
            },
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account?.provider === "demo" || user?.id === "demo-user") {
        token.isDemo = true;
        token.spotifyId = "demo-spotify";
        token.accessToken = "demo-token";
        token.expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
        return token;
      }

      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.spotifyId = account.providerAccountId;
        token.error = undefined;
        return token;
      }

      if (token.isDemo) return token;

      if (
        token.expiresAt &&
        Date.now() < token.expiresAt * 1000 - 60_000 &&
        token.accessToken
      ) {
        return token;
      }

      if (!token.refreshToken) {
        return { ...token, error: "RefreshTokenMissing" };
      }

      try {
        const refreshed = await refreshAccessToken(token.refreshToken);
        return {
          ...token,
          accessToken: refreshed.access_token,
          expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
          refreshToken: refreshed.refresh_token ?? token.refreshToken,
          error: undefined,
        };
      } catch {
        return { ...token, error: "RefreshAccessTokenError" };
      }
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "unknown";
        session.user.spotifyId = token.spotifyId;
      }
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
  trustHost: true,
});

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}
