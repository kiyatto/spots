"use server";

import { signOut } from "@/lib/auth";

/** Clears the session cookie without navigating. */
export async function clearSession(): Promise<void> {
  await signOut({ redirect: false });
}
