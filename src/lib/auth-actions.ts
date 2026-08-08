"use server";

import { signIn, signOut } from "@/lib/auth";

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
