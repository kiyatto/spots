"use server";

import { signIn, signOut } from "@/lib/auth";

export async function signInWithSpotify() {
  // OAuth must perform a full redirect to Spotify
  await signIn("spotify", { redirectTo: "/dashboard" });
}

/** Sets the demo session cookie without navigating. */
export async function establishDemoSession(): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await signIn("demo", { redirect: false });
  if (result?.error) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

/** Clears the session cookie without navigating. */
export async function clearSession(): Promise<void> {
  await signOut({ redirect: false });
}
