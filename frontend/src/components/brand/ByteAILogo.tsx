type Size = 'sm' | 'md' | 'lg';

const boxClass: Record<Size, string> = {
  sm: 'h-9 w-9 rounded-xl shadow-md shadow-teal-500/15',
  md: 'h-14 w-14 rounded-2xl shadow-lg shadow-teal-500/25',
  lg: 'h-[4.5rem] w-[4.5rem] rounded-2xl shadow-xl shadow-teal-500/30',
};

const iconClass: Record<Size, string> = {
  sm: 'h-[1.35rem] w-[1.35rem]',
  md: 'h-8 w-8',
  lg: 'h-11 w-11',
};

const statusClass: Record<Size, string> = {
  sm: 'h-2 w-2 border-2',
  md: 'h-2.5 w-2.5 border-2',
  lg: 'h-3 w-3 border-[2.5px]',
};

type Props = {
  size?: Size;
  showStatus?: boolean;
  className?: string;
};

/** ByteAI product mark — chest imaging + AI scan motif */
export function ByteAILogo({ size = 'md', showStatus = false, className = '' }: Props) {
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-400 ring-1 ring-white/20 ${boxClass[size]} ${className}`}
      aria-hidden
    >
      <svg
        className={`text-slate-950/90 ${iconClass[size]}`}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="4"
          y="5"
          width="24"
          height="22"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.35"
        />
        <path
          d="M16 8v16M10 11c0-2 2.5-3.5 6-3.5s6 1.5 6 3.5c0 4-2.5 7-6 9-3.5-2-6-5-6-9z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 20h20"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          opacity="0.5"
        />
        <circle cx="22" cy="10" r="1.25" fill="currentColor" opacity="0.85" />
        <path
          d="M8 24l3-2 4 1 5-3"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.65"
        />
      </svg>
      {showStatus && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full border-[var(--bg-base)] bg-emerald-400 ${statusClass[size]}`}
        />
      )}
    </div>
  );
}
