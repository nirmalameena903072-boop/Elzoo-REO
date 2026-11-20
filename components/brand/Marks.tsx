/**
 * Both wordmarks are hand-authored SVG logotypes, not icon badges.
 * Volud: lowercase, tight kerning, the d's bowl thread carried out to the right.
 * Alsa: high-contrast serif with a plating rule that starts at the s and runs past the final a.
 */

export function VoludWordmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 168 40" className={className} role="img" aria-label="Volud">
      <title>Volud</title>
      <g fill="currentColor" fontFamily="var(--font-display), Georgia, serif" fontSize="34" fontWeight="500" letterSpacing="-1.6">
        <text x="0" y="29">volu</text>
        {/* the d: bowl drawn as a path so the thread can leave it */}
        <path d="M112.4 8.2v20.4h2.5v-2.3c1.6 1.8 3.8 2.8 6.3 2.8 4.7 0 8.2-3.5 8.2-8.3s-3.5-8.3-8.2-8.3c-2.4 0-4.5.9-6.1 2.6V8.2h-2.7z" />
      </g>
      <path d="M129 21.2h37" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

export function VoludMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 24" className={className} role="img" aria-label="Volud">
      <title>Volud</title>
      <path d="M2 6v9.5c0 2.9 2.1 4.8 5 4.8 2.4 0 4.2-1.1 4.9-2.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 6v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity=".4" />
      <path d="M16.5 10h13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

export function AlsaWordmark({ className, stamp = false }: { className?: string; stamp?: boolean }) {
  return (
    <svg viewBox="0 0 96 32" className={className} role="img" aria-label="Alsa">
      <title>Alsa</title>
      {stamp && <rect x="0.75" y="0.75" width="94.5" height="30.5" rx="5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".6" />}
      <g fill="currentColor" fontFamily="var(--font-display), Georgia, serif" fontSize={stamp ? 20 : 26} fontWeight="400" letterSpacing="-0.2">
        <text x={stamp ? 12 : 6} y={stamp ? 22 : 24}>alsa</text>
      </g>
      <path d={stamp ? "M58 24h24" : "M39 27.4h48"} stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}
