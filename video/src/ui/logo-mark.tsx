/** The forum's mark (src/app/icon.svg): emerald rounded square with a "P" stroke. */
export function LogoMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`${className} shrink-0`}>
      <rect width="24" height="24" rx="6" className="fill-accent" />
      <rect x="0.5" y="0.5" width="23" height="23" rx="5.5" className="fill-none stroke-white/20" />
      <path
        d="M9 17.5V6.5h4a3.25 3.25 0 0 1 0 6.5H9"
        className="fill-none stroke-accent-foreground"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
