/**
 * CatPaw — an animated cat paw that reaches in from the edge of the screen
 * when the user drags a card toward the like/pass threshold.
 *
 * Props:
 * - side: "left" (pass) or "right" (like)
 * - progress: 0→1 how close the card is to committing (0 = centered, 1 = at threshold)
 *
 * The paw starts hidden off-screen and slides in as progress increases.
 * At high progress (>0.6), the toes wiggle excitedly.
 */

interface CatPawProps {
  side: "left" | "right";
  progress: number; // 0 to 1+
}

export function CatPaw({ side, progress }: CatPawProps) {
  // Only start showing the paw after 30% progress
  const adjustedProgress = Math.max(0, (progress - 0.3) / 0.7);
  if (adjustedProgress <= 0) return null;

  const isRight = side === "right";

  // Paw slides in from the edge: 0% = fully hidden, 100% = fully extended
  const slideIn = Math.min(1, adjustedProgress);
  // translateX: starts off-screen (100%) and moves to 0%
  const translateX = isRight
    ? `${(1 - slideIn) * 100}%`
    : `${-(1 - slideIn) * 100}%`;

  // Wiggle intensity increases with progress
  const wiggleIntensity = Math.max(0, (adjustedProgress - 0.5) * 2); // 0→1 in the last 50%
  const wiggleDeg = wiggleIntensity * 8; // max 8 degrees

  // Color: green for like (right), red/pink for pass (left)
  const pawColor = isRight ? "#22c55e" : "#f87171";
  const padColor = isRight ? "#16a34a" : "#dc2626";

  return (
    <div
      className="pointer-events-none absolute top-1/2 z-50"
      style={{
        [isRight ? "right" : "left"]: 0,
        transform: `translateY(-50%) translateX(${translateX})`,
        transition: "transform 0.05s linear",
      }}
    >
      <div
        style={{
          animation: wiggleIntensity > 0
            ? `catPawWiggle 0.3s ease-in-out infinite alternate`
            : undefined,
          // CSS custom property for dynamic wiggle amount
          ["--wiggle-deg" as string]: `${wiggleDeg}deg`,
          transform: isRight ? "scaleX(-1)" : undefined,
        }}
      >
        <svg
          width="72"
          height="96"
          viewBox="0 0 72 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Arm/wrist */}
          <rect
            x="20"
            y="40"
            width="32"
            height="56"
            rx="16"
            fill={pawColor}
          />
          {/* Main palm pad */}
          <ellipse cx="36" cy="36" rx="22" ry="24" fill={pawColor} />
          {/* Central pad (big toe pad) */}
          <ellipse cx="36" cy="42" rx="10" ry="8" fill={padColor} opacity="0.7" />

          {/* Toe beans - 4 toes */}
          <ellipse cx="20" cy="18" rx="7" ry="9" fill={pawColor} />
          <ellipse cx="20" cy="20" rx="4" ry="5" fill={padColor} opacity="0.6" />

          <ellipse cx="33" cy="12" rx="7" ry="9" fill={pawColor} />
          <ellipse cx="33" cy="14" rx="4" ry="5" fill={padColor} opacity="0.6" />

          <ellipse cx="47" cy="12" rx="7" ry="9" fill={pawColor} />
          <ellipse cx="47" cy="14" rx="4" ry="5" fill={padColor} opacity="0.6" />

          <ellipse cx="56" cy="20" rx="7" ry="9" fill={pawColor} />
          <ellipse cx="56" cy="22" rx="4" ry="5" fill={padColor} opacity="0.6" />
        </svg>
      </div>

      {/* Inline keyframes for the wiggle animation */}
      <style>{`
        @keyframes catPawWiggle {
          0% { transform: ${isRight ? "scaleX(-1) " : ""}rotate(calc(-1 * var(--wiggle-deg))); }
          100% { transform: ${isRight ? "scaleX(-1) " : ""}rotate(var(--wiggle-deg)); }
        }
      `}</style>
    </div>
  );
}
