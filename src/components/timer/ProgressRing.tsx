'use client';

/**
 * ProgressRing — SVG circular progress indicator.
 * Rotated -90° so progress starts at the 12 o'clock position.
 */
interface ProgressRingProps {
  size: number;
  strokeWidth: number;
  /** 0 (empty) → 1 (full) */
  progress: number;
  color: string;
  trackColor?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  size,
  strokeWidth,
  progress,
  color,
  trackColor = 'var(--border)',
  children,
}: ProgressRingProps) {
  const r            = (size - strokeWidth) / 2;
  const cx           = size / 2;
  const circumference = 2 * Math.PI * r;
  const clamped      = Math.max(0, Math.min(1, progress));
  const offset       = circumference * (1 - clamped);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* SVG ring */}
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.4s linear, stroke 0.4s ease',
          }}
        />
      </svg>

      {/* Centred content */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
