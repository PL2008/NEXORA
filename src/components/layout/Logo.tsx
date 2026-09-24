export function Logo({ compact }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-ink" />
        <path
          d="M10 22V10l12 12V10"
          fill="none"
          className="stroke-inverse"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {compact ? null : <span className="text-[15px] font-semibold tracking-[0.12em] text-ink">NEXORA</span>}
    </span>
  )
}
