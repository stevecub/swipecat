/**
 * CatPaw — a horizontal cat claw that reaches from the screen edge to grab
 * the card as it's dragged toward the like/pass threshold.
 *
 * Behavior:
 * - Appears from the side the card is being dragged TOWARD
 * - Oriented horizontally, "reaching" to grab the card edge
 * - At ~50% progress, the claws close into a grabbing pose
 * - Once "grabbed," the claw moves off-screen in unison with the card
 * - If the user reverses direction, this claw retracts and the other appears
 *
 * Props:
 * - side: "left" (pass) or "right" (like) — which edge the claw comes from
 * - progress: 0→1+ how far the card has moved toward this side's threshold
 * - cardX: the actual card x position in px (for syncing claw movement post-grab)
 */

interface CatPawProps {
  side: "left" | "right";
  progress: number; // 0 to 1+
  cardX: number;    // actual card translateX in px
}

export function CatPaw({ side, progress, cardX }: CatPawProps) {
  // Don't render until card has moved at least 20% toward this side
  if (progress < 0.2) return null;

  const isRight = side === "right";

  // Phase 1 (0.2 → 0.6): Claw reaches in from the edge toward the card
  // Phase 2 (0.6 → 1.0): Claw "grabs" and moves with the card off-screen
  const reachProgress = Math.min(1, (progress - 0.2) / 0.4); // 0→1 during reach phase
  const grabProgress = Math.max(0, (progress - 0.6) / 0.4);  // 0→1 during grab phase
  const isGrabbing = progress >= 0.55;

  // Claw finger curl: open (0°) → closed grab (-25°)
  const clawCurl = isGrabbing ? -25 : -5 * reachProgress;

  // Horizontal position of the claw:
  // During reach: slides from off-screen (120px away) to the card edge
  // During grab: follows the card movement
  const reachOffset = (1 - reachProgress) * 120; // px from card edge
  
  // Once grabbing, the claw should move with the card
  const grabOffset = grabProgress > 0 ? Math.abs(cardX) * 0.3 : 0;

  // Final translateX: claw comes from the edge
  const translateX = isRight
    ? reachOffset + grabOffset   // comes from right, moves further right with card
    : -(reachOffset + grabOffset); // comes from left, moves further left with card

  // Slight vertical bob during reach (makes it feel alive)
  const bobY = Math.sin(reachProgress * Math.PI * 2) * 3;

  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{
        top: "45%",
        [isRight ? "right" : "left"]: `-20px`,
        transform: `translateX(${translateX}px) translateY(${bobY}px)`,
        transition: progress < 0.25 ? "transform 0.15s ease-out, opacity 0.15s" : "none",
        opacity: Math.min(1, (progress - 0.2) * 5), // fade in quickly
      }}
    >
      <svg
        width="80"
        height="64"
        viewBox="0 0 80 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transform: isRight ? "scaleX(-1)" : undefined,
        }}
      >
        {/* Arm coming from the side */}
        <rect
          x="-10"
          y="22"
          width="50"
          height="20"
          rx="10"
          fill={isRight ? "#f9a825" : "#f9a825"}
        />

        {/* Palm / main paw body */}
        <ellipse cx="42" cy="32" rx="16" ry="16" fill="#f9a825" />
        {/* Palm pad */}
        <ellipse cx="40" cy="35" rx="8" ry="6" fill="#e65100" opacity="0.5" />

        {/* Claw fingers — 3 fingers reaching horizontally */}
        {/* Top finger */}
        <g
          style={{
            transform: `rotate(${clawCurl * 0.8}deg)`,
            transformOrigin: "50px 20px",
            transition: isGrabbing ? "transform 0.15s ease-in" : "transform 0.2s ease-out",
          }}
        >
          <rect x="50" y="16" width="22" height="8" rx="4" fill="#f9a825" />
          <ellipse cx="72" cy="20" rx="4" ry="4" fill="#f9a825" />
          {/* Claw tip */}
          <path d="M74 18 L80 16 L78 20 Z" fill="#e0e0e0" opacity="0.9" />
        </g>

        {/* Middle finger */}
        <g
          style={{
            transform: `rotate(${clawCurl}deg)`,
            transformOrigin: "50px 32px",
            transition: isGrabbing ? "transform 0.15s ease-in" : "transform 0.2s ease-out",
          }}
        >
          <rect x="52" y="28" width="24" height="8" rx="4" fill="#f9a825" />
          <ellipse cx="76" cy="32" rx="4" ry="4" fill="#f9a825" />
          {/* Claw tip */}
          <path d="M78 30 L84 28 L82 32 Z" fill="#e0e0e0" opacity="0.9" />
        </g>

        {/* Bottom finger */}
        <g
          style={{
            transform: `rotate(${clawCurl * 0.8}deg)`,
            transformOrigin: "50px 44px",
            transition: isGrabbing ? "transform 0.15s ease-in" : "transform 0.2s ease-out",
          }}
        >
          <rect x="50" y="40" width="22" height="8" rx="4" fill="#f9a825" />
          <ellipse cx="72" cy="44" rx="4" ry="4" fill="#f9a825" />
          {/* Claw tip */}
          <path d="M74 42 L80 40 L78 44 Z" fill="#e0e0e0" opacity="0.9" />
        </g>

        {/* Fur tufts on the arm */}
        <ellipse cx="10" cy="20" rx="6" ry="4" fill="#fbc02d" opacity="0.6" />
        <ellipse cx="10" cy="44" rx="6" ry="4" fill="#fbc02d" opacity="0.6" />
      </svg>

      {/* Grabbing animation — slight squeeze when grabbing */}
      {isGrabbing && (
        <style>{`
          @keyframes catGrab {
            0%, 100% { transform: ${isRight ? "scaleX(-1) " : ""}scale(1); }
            50% { transform: ${isRight ? "scaleX(-1) " : ""}scale(1.05, 0.95); }
          }
        `}</style>
      )}
    </div>
  );
}
