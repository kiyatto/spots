"use client";

import { useTransition } from "react";
import { clearSession } from "@/lib/auth-actions";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await clearSession();
          window.location.assign("/");
        });
      }}
      className="font-mono text-sm text-white/50 hover:text-white disabled:opacity-50"
    >
      {pending ? "signing out…" : "sign out"}
    </button>
  );
}
