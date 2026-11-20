/** Illustration du haut de page : une balance de la justice au trait, dessinée en code (aucune image externe). */
export function Balance({ className }: { className?: string }) {
  const trait = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  const plateau = (x: number) => (
    <g>
      <path d={`M${x} 92 L${x - 34} 170 M${x} 92 L${x + 34} 170`} {...trait} strokeWidth={1.2} />
      <path d={`M${x - 42} 170 Q${x} 204 ${x + 42} 170 Z`} {...trait} />
      <circle cx={x} cy={92} r={4} {...trait} />
    </g>
  );
  return (
    <svg viewBox="0 0 320 340" className={className} aria-hidden="true" focusable="false">
      <circle cx="160" cy="58" r="9" {...trait} />
      <path d="M160 67 V296" {...trait} strokeWidth={3} />
      <path d="M62 86 Q160 70 258 86" {...trait} strokeWidth={2.5} />
      {plateau(62)}
      {plateau(258)}
      <path d="M118 296 H202 M100 312 H220 M132 296 Q160 270 188 296" {...trait} />
    </svg>
  );
}
