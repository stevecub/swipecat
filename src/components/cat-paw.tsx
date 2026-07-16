/**
 * CatPaw — a cute, chubby cartoon cat paw that reaches horizontally from the
 * screen edge to grab the card as it's dragged toward the like/pass threshold.
 *
 * Style: rounded, outlined cartoon paw with big pink toe beans (like the reference).
 * Position: near the TOP of the card (not middle).
 *
 * Behavior:
 * - Appears from the side the card is being dragged TOWARD
 * - At ~55% progress, the toes curl into a grabbing pose
 * - Once "grabbed," the paw moves off-screen in unison with the card
 * - If the user reverses direction, this paw retracts and the other appears
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

  // Phase 1 (0.2 → 0.6): Paw reaches in from the edge toward the card
  // Phase 2 (0.6 → 1.0): Paw "grabs" and moves with the card off-screen
  const reachProgress = Math.min(1, (progress - 0.2) / 0.4); // 0→1 during reach phase
  const grabProgress = Math.max(0, (progress - 0.6) / 0.4);  // 0→1 during grab phase
  const isGrabbing = progress >= 0.55;

  // Toe curl: open (0°) → closed grab (-20°)
  const toeCurl = isGrabbing ? -20 : -3 * reachProgress;

  // Horizontal position:
  // During reach: slides from off-screen (100px away) to the card edge
  // During grab: follows the card movement
  const reachOffset = (1 - reachProgress) * 100;
  const grabOffset = grabProgress > 0 ? Math.abs(cardX) * 0.3 : 0;

  const translateX = isRight
    ? reachOffset + grabOffset
    : -(reachOffset + grabOffset);

  // Subtle vertical bob during reach
  const bobY = Math.sin(reachProgress * Math.PI * 2) * 2;

  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{
        top: "18%",
        [isRight ? "right" : "left"]: `-24px`,
        transform: `translateX(${translateX}px) translateY(${bobY}px)`,
        transition: progress < 0.25 ? "transform 0.15s ease-out, opacity 0.15s" : "none",
        opacity: Math.min(1, (progress - 0.2) * 5),
      }}
    >
      <svg
        width="90"
        height="80"
        viewBox="0 0 90 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transform: isRight ? "scaleX(-1)" : undefined,
        }}
      >
        {/* Arm — chubby with orange tabby stripes */}
        <rect x="-15" y="28" width="55" height="26" rx="13" fill="#FFF" stroke="#333" strokeWidth="2" />
        {/* Tabby stripes on arm */}
        <path d="M5 32 Q8 38 5 44" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        <path d="M15 30 Q18 38 15 46" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        <path d="M25 29 Q28 38 25 47" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" opacity="0.7" />

        {/* Main palm — big chubby circle */}
        <ellipse cx="50" cy="40" rx="20" ry="20" fill="#FFF" stroke="#333" strokeWidth="2" />

        {/* Big central pad — pink heart-ish shape */}
        <ellipse cx="48" cy="44" rx="9" ry="8" fill="#FFB6C1" stroke="#333" strokeWidth="1" />

        {/* Four toe beans — chubby round pink pads */}
        {/* Top-left toe */}
        <g
          style={{
            transform: `rotate(${toeCurl * 0.7}deg)`,
            transformOrigin: "42px 26px",
            transition: isGrabbing ? "transform 0.15s ease-in" : "transform 0.2s ease-out",
          }}
        >
          <ellipse cx="38" cy="22" rx="7" ry="8" fill="#FFF" stroke="#333" strokeWidth="2" />
          <ellipse cx="38" cy="24" rx="4" ry="5" fill="#FFB6C1" />
        </g>

        {/* Top-center-left toe */}
        <g
          style={{
            transform: `rotate(${toeCurl * 0.9}deg)`,
            transformOrigin: "50px 24px",
            transition: isGrabbing ? "transform 0.15s ease-in" : "transform 0.2s ease-out",
          }}
        >
          <ellipse cx="50" cy="18" rx="7" ry="8" fill="#FFF" stroke="#333" strokeWidth="2" />
          <ellipse cx="50" cy="20" rx="4" ry="5" fill="#FFB6C1" />
        </g>

        {/* Top-center-right toe */}
        <g
          style={{
            transform: `rotate(${toeCurl}deg)`,
            transformOrigin: "60px 24px",
            transition: isGrabbing ? "transform 0.15s ease-in" : "transform 0.2s ease-out",
          }}
        >
          <ellipse cx="62" cy="20" rx="7" ry="8" fill="#FFF" stroke="#333" strokeWidth="2" />
          <ellipse cx="62" cy="22" rx="4" ry="5" fill="#FFB6C1" />
        </g>

        {/* Top-right toe (thumb) */}
        <g
          style={{
            transform: `rotate(${toeCurl * 0.6}deg)`,
            transformOrigin: "68px 32px",
            transition: isGrabbing ? "transform 0.15s ease-in" : "transform 0.2s ease-out",
          }}
        >
          <ellipse cx="70" cy="32" rx="6" ry="7" fill="#FFF" stroke="#333" strokeWidth="2" />
          <ellipse cx="70" cy="33" rx="3.5" ry="4.5" fill="#FFB6C1" />
        </g>
      </svg>
    </div>
  );
}
