import Link from "next/link";

export function BrandMark({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="font-mono text-[18px] text-white tracking-tight hover:opacity-80 transition-opacity"
    >
      spots
    </Link>
  );
}
