/**
 * The literal formula the API runs for every ledger entry — not marketing
 * copy. Laid out with light manual syntax coloring (function name vs.
 * operators vs. the fields being hashed) so the one thing a technical
 * reader actually wants to parse — "what goes into the hash" — is the part
 * that stands out, plus a plain-English line underneath for everyone else.
 */
export function HashFormula() {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 px-1 font-mono text-[11px] tracking-wide text-muted-foreground/80 uppercase">
        <span className="size-1 rounded-full bg-chain" />
        The actual formula, not a description of it
      </div>

      <div className="mt-2 rounded-xl bg-linear-to-br from-chain/40 via-border/60 to-chain/10 p-px">
        <code className="block overflow-x-auto rounded-[11px] bg-card/80 px-4 py-3 font-mono text-[12.5px] leading-relaxed backdrop-blur-sm">
          <span className="text-foreground">hash</span>
          <span className="text-muted-foreground"> = </span>
          <span className="font-semibold text-chain">sha256</span>
          <span className="text-muted-foreground">(</span>
          <span className="text-foreground">prevHash</span>
          <span className="text-muted-foreground"> + </span>
          <span className="text-foreground/80">JSON</span>
          <span className="text-muted-foreground">.</span>
          <span className="text-foreground/80">stringify</span>
          <span className="text-muted-foreground">({"{"} </span>
          <span className="text-muted-foreground/90">
            stepId, timestamp, agent, action, input, output
          </span>
          <span className="text-muted-foreground"> {"}"}))</span>
        </code>
      </div>

      <p className="mt-2 px-1 text-[12px] leading-relaxed text-muted-foreground">
        Every entry commits to its own contents and to the hash before it.
        Change one byte anywhere in the chain — on purpose or by
        accident — and every hash after it stops matching.
      </p>
    </div>
  );
}
