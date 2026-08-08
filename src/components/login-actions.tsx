"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { establishDemoSession } from "@/lib/auth-actions";

/**
 * Spotify sign-in must go through the Auth.js HTTP route (not a Server Action).
 * On Next.js 16, `signIn()` from next-auth can build the wrong redirect_uri
 * (https / localhost), which Spotify rejects with invalid_grant.
 */
export function LoginActions({
  demoEnabled,
  spotifyEnabled = true,
}: {
  demoEnabled: boolean;
  spotifyEnabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [csrfToken, setCsrfToken] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/csrf")
      .then((res) => res.json())
      .then((data: { csrfToken?: string }) => {
        if (!cancelled && data.csrfToken) setCsrfToken(data.csrfToken);
      })
      .catch(() => {
        /* button stays disabled until csrf loads */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      {spotifyEnabled ? (
        <form action="/api/auth/signin/spotify" method="POST">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <input type="hidden" name="callbackUrl" value="/dashboard" />
          <button
            type="submit"
            disabled={!csrfToken}
            className="flex items-center justify-center gap-2.5 rounded-lg bg-[#1ed760] px-5 py-4 font-sans text-[18px] font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
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
