import { redirect } from "next/navigation";
import { LoginActions } from "@/components/login-actions";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const spotifyConfigured = Boolean(
    process.env.AUTH_SPOTIFY_ID && process.env.AUTH_SPOTIFY_SECRET,
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-16 px-6">
      <h1 className="font-sans text-[18px] font-semibold text-white">spots</h1>
      <div className="flex flex-col items-center gap-6">
        {spotifyConfigured ? (
          <LoginActions />
        ) : (
          <p className="max-w-sm text-center font-mono text-sm text-white/60">
            add AUTH_SPOTIFY_ID and AUTH_SPOTIFY_SECRET to .env.local to enable
            Spotify login.
          </p>
        )}
      </div>
    </main>
  );
}
