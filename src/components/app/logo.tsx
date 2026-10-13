import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={cn("size-9", className)} aria-hidden="true">
      <rect width="512" height="512" rx="112" fill="#1B3B2F" />
      <path d="M256 404c-8-58 2-118 44-170 38-47 92-74 128-82-4 52-22 110-62 152-34 36-74 54-110 58" fill="#8DBB9B" />
      <path d="M256 404c6-46-2-96-34-138-29-38-72-60-102-68 3 42 18 90 50 124 26 28 56 44 86 50" fill="#C9D59A" />
      <path d="M256 412V250" stroke="#F8F6F0" strokeWidth="14" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className={cn("font-display text-lg font-semibold leading-none tracking-tight", light ? "text-white" : "text-forest-900")}>
        Zielony Zakątek
      </span>
    </span>
  );
}
