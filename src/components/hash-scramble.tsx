"use client";

import { useEffect, useState } from "react";

const HEX = "0123456789abcdef";

function randomHex(length: number) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += HEX[Math.floor(Math.random() * HEX.length)];
  }
  return out;
}

/**
 * A stand-in for "working" that looks like what this product actually does
 * — computing a hash — instead of a generic spinner. Purely decorative
 * (the accessible name comes from the visible "Running" label beside it),
 * and freezes to one static value when the OS asks for reduced motion.
 */
export function HashScramble({ length = 6 }: { length?: number }) {
  const [value, setValue] = useState(() => randomHex(length));

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const id = setInterval(() => setValue(randomHex(length)), 90);
    return () => clearInterval(id);
  }, [length]);

  return (
    <span aria-hidden="true" className="font-mono tabular-nums">
      {value}
    </span>
  );
}
