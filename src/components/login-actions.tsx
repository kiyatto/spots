"use client";

import Image from "next/image";
import { useTransition } from "react";
import {
  establishDemoSession,
  signInWithSpotify,
} from "@/lib/auth-actions";

export function LoginActions({
  demoEnabled,
  spotifyEnabled = true,
}: {
  demoEnabled: boolean;
  spotifyEnabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-center gap-4">
      {spotifyEnabled ? (
        <form action={signInWithSpotify}>
          <button
            type="submit"
            disabled={pending}
            className="flex items-center justify-center gap-2.5 rounded-lg bg-[#1ed760] px-5 py-4 font-sans text-[18px] font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
          >
            Log in with Spotify
            <span className="relative size-[23px] shrink-0 overflow-hidden">
              <Image
                src="/assets/spotify-logo.png"
                alt=""
                width={23}
                height={23}
                className="size-full object-cover invert"
              />
            </span>
          </button>
        </form>
      ) : null}
      {demoEnabled ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await establishDemoSession();
              if (!result.ok) {
                console.error(result.error);
                return;
              }
              // Hard navigation so the new session cookie is picked up
              window.location.assign("/dashboard");
            });
          }}
          className="font-mono text-sm text-white/60 underline-offset-4 hover:text-white hover:underline disabled:opacity-50"
        >
          {pending ? "signing in…" : "continue in demo mode"}
        </button>
      ) : null}
    </div>
  );
}
