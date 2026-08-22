export function BrainMark({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <line x1="12" y1="2" x2="12" y2="7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12" y2="22" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="2" y1="12" x2="7" y2="12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="17" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="4.22" y1="4.22" x2="7.76" y2="7.76" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="16.24" y1="16.24" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="19.78" y1="4.22" x2="16.24" y2="7.76" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="7.76" y1="16.24" x2="4.22" y2="19.78" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
