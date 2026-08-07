import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { PlaylistGrid } from "@/components/playlist-grid";
import { SignOutButton } from "@/components/sign-out-button";
import { auth } from "@/lib/auth";
import {
  getMyAnnotatedPlaylists,
  getSpotifyPlaylistsAction,
} from "@/lib/actions";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const [annotated, spotify] = await Promise.all([
    getMyAnnotatedPlaylists(),
    getSpotifyPlaylistsAction().catch(() => []),
  ]);

  return (
    <main className="flex min-h-screen flex-col gap-20 p-10">
      <header className="flex items-center justify-between gap-4">
        <BrandMark />
        <SignOutButton />
      </header>
      <PlaylistGrid annotated={annotated} spotify={spotify} />
    </main>
  );
}
