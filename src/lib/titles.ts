/** Returns baseTitle, or "baseTitle 2", "baseTitle 3", … if taken. */
export function nextUniqueTitle(
  existingTitles: string[],
  baseTitle: string,
  options?: { excludeTitle?: string },
): string {
  const base = baseTitle.trim() || "untitled";
  const excluded = options?.excludeTitle?.trim().toLowerCase();
  const taken = new Set(
    existingTitles
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t && t !== excluded),
  );

  if (!taken.has(base.toLowerCase())) return base;

  let n = 2;
  while (taken.has(`${base} ${n}`.toLowerCase())) {
    n += 1;
  }
  return `${base} ${n}`;
}
