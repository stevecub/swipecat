/**
 * daily-notifications.ts
 *
 * Manages a daily "Fresh picks are ready!" local notification using
 * @capacitor/local-notifications. The notification fires every day at 10:00 AM
 * local time, bringing users back to discover new products.
 *
 * The user's preference (enabled/disabled) is persisted to localStorage.
 * On native iOS, this requests notification permission on first enable.
 * On web/dev mode, all calls are no-ops.
 */

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const PREF_KEY = "swipecat:daily-notif:v1";
const NOTIFICATION_ID = 9001; // Stable ID so we can cancel/replace

/** Notification messages — we rotate through them for variety */
const MESSAGES = [
  "Your fresh picks are ready! 🐱 Swipe to discover something new.",
  "New products waiting for you! 🛍️ Come see what's trending.",
  "Time to swipe! 🎯 Fresh finds are ready in SwipeCat.",
  "Your daily picks just dropped! 🔥 Open SwipeCat to explore.",
  "Something new is waiting! ✨ Swipe right on your next favorite.",
];

/**
 * Check if the user has enabled daily notifications.
 * Defaults to TRUE if no preference has been set yet (first launch).
 * The user can explicitly turn it off from the Categories page.
 */
export function isDailyNotifEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const val = window.localStorage.getItem(PREF_KEY);
    // No preference saved yet = first launch = default ON
    if (val === null) return true;
    return val === "true";
  } catch {
    return true;
  }
}

/** Persist the user's preference */
function setPref(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREF_KEY, enabled ? "true" : "false");
  } catch {
    // Ignore storage errors
  }
}

/**
 * Enable daily notifications.
 * - Requests permission if not already granted
 * - Schedules a repeating daily notification at 10:00 AM local time
 * - Persists the preference
 *
 * Returns true if successfully enabled, false if permission was denied.
 */
export async function enableDailyNotifications(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // On web, just save the preference (no actual notifications)
    setPref(true);
    return true;
  }

  try {
    // Check current permission status
    let permStatus = await LocalNotifications.checkPermissions();

    if (permStatus.display === "prompt" || permStatus.display === "prompt-with-rationale") {
      // Request permission — this shows the iOS system prompt
      permStatus = await LocalNotifications.requestPermissions();
    }

    if (permStatus.display !== "granted") {
      // User denied — don't save preference as enabled
      return false;
    }

    // Cancel any existing daily notification before scheduling a new one
    await cancelDailyNotification();

    // Schedule a daily notification at 10:00 AM local time
    // Pick a random message for variety
    const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_ID,
          title: "SwipeCat",
          body: msg,
          schedule: {
            on: {
              hour: 10,
              minute: 0,
            },
            repeats: true,
            allowWhileIdle: true,
          },
          sound: undefined, // Use default system sound
          autoCancel: true,
        },
      ],
    });

    setPref(true);
    return true;
  } catch (err) {
    console.error("Failed to enable daily notifications:", err);
    return false;
  }
}

/**
 * Disable daily notifications.
 * - Cancels any pending scheduled notification
 * - Persists the preference
 */
export async function disableDailyNotifications(): Promise<void> {
  setPref(false);

  if (!Capacitor.isNativePlatform()) return;

  await cancelDailyNotification();
}

/** Cancel the scheduled daily notification */
async function cancelDailyNotification() {
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: NOTIFICATION_ID }],
    });
  } catch {
    // May fail if no notification was scheduled — that's fine
  }
}

/**
 * Initialize notifications on app startup.
 * - On first launch (no preference saved): automatically requests permission
 *   and schedules daily notifications (default ON behavior).
 * - On subsequent launches: re-schedules if user hasn't turned them off
 *   (iOS clears scheduled notifications on app update).
 */
export async function initDailyNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!isDailyNotifEnabled()) return;

  // Enable (and request permission on first launch)
  await enableDailyNotifications();
}
