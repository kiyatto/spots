import { notFound } from "next/navigation";
import { PlaylistEditor } from "@/components/playlist-editor";
import { getPlaylistBySlug } from "@/lib/store";

export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const playlist = await getPlaylistBySlug(slug);
  if (!playlist) notFound();

  return (
    <main className="flex min-h-screen flex-col p-10">
      <PlaylistEditor playlist={playlist} editable={false} />
    </main>
  );
}
