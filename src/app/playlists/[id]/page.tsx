import { notFound, redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { PlaylistEditor } from "@/components/playlist-editor";
import { auth } from "@/lib/auth";
import { loadOwnerPlaylist } from "@/lib/actions";

export default async function PlaylistEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  const { id } = await params;
  const playlist = await loadOwnerPlaylist(id);
  if (!playlist) notFound();

  return (
    <main className="flex min-h-screen flex-col gap-10 p-10">
      <BrandMark />
      <PlaylistEditor playlist={playlist} editable />
    </main>
  );
}
