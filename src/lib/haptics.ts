/**
 * Lightweight haptics wrapper.
 * - On the native iOS shell (Capacitor), uses real Taptic Engine feedback.
 * - On web, silently no-ops (or falls back to the Vibration API if present).
 *
 * Import is dynamic so the web bundle never tries to load the native plugin.
 */

type Style = "light" | "medium" | "heavy" | "success" | "warning" | "error";

let cached: Promise<{
  impact: (style: Style) => Promise<void>;
} | null> | null = null;

function isNative(): boolean {
  if (typeof window === "undefined") return false;
  // Capacitor injects this global on native builds.
  return Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
}

async function load() {
  if (!isNative()) return null;
  if (cached) return cached;
  cached = (async () => {
    try {
      const mod = await import("@capacitor/haptics");
      const { Haptics, ImpactStyle, NotificationType } = mod;
      return {
        impact: async (style: Style) => {
          try {
            if (style === "success") {
              await Haptics.notification({ type: NotificationType.Success });
            } else if (style === "warning") {
              await Haptics.notification({ type: NotificationType.Warning });
            } else if (style === "error") {
              await Haptics.notification({ type: NotificationType.Error });
            } else {
              await Haptics.impact({
                style:
                  style === "heavy"
                    ? ImpactStyle.Heavy
                    : style === "medium"
                      ? ImpactStyle.Medium
                      : ImpactStyle.Light,
              });
            }
          } catch {
            /* ignore */
          }
        },
      };
    } catch {
      return null;
    }
  })();
  return cached;
}

export async function haptic(style: Style = "light"): Promise<void> {
  const h = await load();
  if (h) {
    await h.impact(style);
    return;
  }
  // Web fallback — Safari iOS ignores this, but Android Chrome supports it.
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    const ms = style === "heavy" ? 25 : style === "medium" ? 15 : 8;
    try {
      (navigator as Navigator & { vibrate: (p: number) => boolean }).vibrate(ms);
    } catch {
      /* ignore */
    }
  }
}
