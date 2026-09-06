import React from 'react';

interface LoopMotifProps {
  size?: number;
  className?: string;
  variant?: 'welcome' | 'compact' | 'subtle';
}

export const LoopMotif: React.FC<LoopMotifProps> = ({
  size = 140,
  className = '',
  variant = 'welcome',
}) => {
  if (variant === 'compact') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <circle cx="50" cy="50" r="36" stroke="#D9D9D4" strokeWidth="1.8" strokeDasharray="4 4" />
        <path
          d="M 50 14 A 36 36 0 1 1 20 30"
          stroke="#191B1C"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        {/* Interruption node with deep green signature accent */}
        <circle cx="20" cy="30" r="3.5" fill="#17372E" />
        {/* Core observer node */}
        <circle cx="50" cy="50" r="4" fill="#191B1C" />
      </svg>
    );
  }

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transform transition-transform duration-700"
      >
        {/* Outer habitual loop track (faint) */}
        <circle
          cx="100"
          cy="100"
          r="64"
          stroke="#D9D9D4"
          strokeWidth="1.6"
          strokeDasharray="4 6"
        />

        {/* The automatic loop path with deliberate interruption gap */}
        <path
          d="M 100 36 A 64 64 0 1 1 45 68"
          stroke="#191B1C"
          strokeWidth="3.6"
          strokeLinecap="round"
        />

        {/* Point of interruption */}
        <line
          x1="45"
          y1="68"
          x2="35"
          y2="82"
          stroke="#191B1C"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Trigger marker */}
        <circle cx="100" cy="36" r="4" fill="#191B1C" />
        
        {/* Interruption target with restrained green accent */}
        <circle cx="45" cy="68" r="4.5" fill="#17372E" />

        {/* Center core: The Observer */}
        <circle cx="100" cy="100" r="8" fill="#191B1C" />
        <circle cx="100" cy="100" r="3" fill="#F4F3EF" />

        {/* Orbit indicator lines */}
        <path
          d="M 100 100 L 146 146"
          stroke="#747779"
          strokeWidth="1"
          strokeDasharray="2 3"
        />
        <circle cx="146" cy="146" r="2.5" fill="#747779" />
      </svg>
    </div>
  );
};
