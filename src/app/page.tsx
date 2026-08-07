import { redirect } from "next/navigation";
import { LoginActions } from "@/components/login-actions";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const demoEnabled = process.env.SPOTS_DEMO_MODE === "true";
  const spotifyConfigured = Boolean(
    process.env.AUTH_SPOTIFY_ID && process.env.AUTH_SPOTIFY_SECRET,
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-16 px-6">
      <h1 className="font-sans text-[18px] font-semibold text-white">spots</h1>
      <div className="flex flex-col items-center gap-6">
        {spotifyConfigured || demoEnabled ? (
          <LoginActions
            demoEnabled={demoEnabled}
            spotifyEnabled={spotifyConfigured}
          />
        ) : (
          <p className="max-w-sm text-center font-mono text-sm text-white/60">
            add AUTH_SPOTIFY_ID and AUTH_SPOTIFY_SECRET to .env.local, or enable
            SPOTS_DEMO_MODE=true for local testing without Spotify.
          </p>
        )}
      </div>
    </main>
  );
}
