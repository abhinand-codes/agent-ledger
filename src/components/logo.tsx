/**
 * The mark: a wax-seal monogram, not an icon-font glyph or a gradient blob.
 * Three overlapping "links" trace an L (for Ledger) that is also, literally,
 * a chain — so the logo and the product's actual mechanism are the same
 * shape. Pure stroked geometry, no detail to lose at favicon size.
 *
 * Uses `currentColor`, so a wrapping `text-chain` or `text-verified` picks
 * the ink — the same mark serves as the brand logo and the "verified" seal.
 */
export function SealMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden>
      <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="2.5" opacity="0.55" />
      <circle cx="50" cy="50" r="38.5" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <g stroke="currentColor" strokeWidth="7" strokeLinecap="round">
        <rect x="42" y="20" width="16" height="34" rx="8" />
        <rect x="42" y="46" width="16" height="34" rx="8" />
        <rect x="50" y="64" width="34" height="16" rx="8" />
      </g>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2.5">
        <SealMark className="size-7 shrink-0 text-chain sm:size-8" />
        <span className="font-display text-lg font-medium tracking-tight sm:text-xl">
          Agent <em className="font-normal italic">Ledger</em>
        </span>
      </div>
    </div>
  );
}
