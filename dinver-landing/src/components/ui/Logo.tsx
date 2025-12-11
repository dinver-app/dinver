interface LogoProps {
  className?: string;
  showText?: boolean;
  variant?: 'light' | 'dark';
}

export default function Logo({ className = '', showText = true, variant = 'dark' }: LogoProps) {
  const textColor = variant === 'dark' ? 'text-dinver-dark' : 'text-white';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Fork and knife forming a D shape */}
        <circle cx="20" cy="20" r="18" fill="#10B981" />
        <path
          d="M14 10V30M14 10C14 10 18 12 18 16C18 20 14 20 14 20"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M26 10V14M26 14V18M26 18C28 18 28 14 28 14M26 18V30M24 10V14M24 14C22 14 22 18 24 18M24 14V10M28 10V14"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <span className={`text-2xl font-bold tracking-tight ${textColor}`}>
          Dinver
        </span>
      )}
    </div>
  );
}
