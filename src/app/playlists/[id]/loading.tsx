import { BrandMark } from "@/components/brand-mark";

export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col p-10">
      <BrandMark href="/" />
      <div className="flex flex-1 flex-col items-center justify-center gap-20">
        <p className="font-mono text-[18px] text-white">loading playlist</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/mascot.png"
          alt=""
          width={200}
          height={200}
          className="size-[200px] object-cover"
        />
      </div>
    </main>
  );
}
