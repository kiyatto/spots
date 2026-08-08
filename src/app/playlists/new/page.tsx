import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { auth } from "@/lib/auth";
import { createSpotifyPlaylistAction } from "@/lib/actions";

export default async function NewPlaylistPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  return (
    <main className="flex min-h-screen flex-col gap-16 p-10">
      <BrandMark />
      <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        <h1 className="font-mono text-[22px] uppercase text-white">
          create playlist
        </h1>
        <p className="font-mono text-sm text-white/50">
          this creates a real playlist on Spotify. you can search and add songs
          from the editor afterward.
        </p>
        <form action={createSpotifyPlaylistAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 font-mono text-sm text-white/70">
            name
            <input
              name="name"
              required
              placeholder="playlist name"
              className="rounded border border-white/10 bg-[#1c1c1c] px-3 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#1ed760]"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-[#1ed760] px-5 py-3 font-sans text-[16px] font-semibold text-black hover:brightness-110"
          >
            create on Spotify
          </button>
        </form>
      </div>
    </main>
  );
}
