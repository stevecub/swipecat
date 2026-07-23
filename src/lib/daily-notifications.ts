/**
 * daily-notifications.ts
 *
 * Manages daily local notifications using @capacitor/local-notifications.
 * The notification fires every day at 10:00 AM local time.
 *
 * Notification copy uses two psychological levers:
 *   - Curiosity-gap: make the user wonder what's waiting inside
 *   - Loss-aversion: make the user fear missing out or losing their streak
 *
 * The user's preference (enabled/disabled) is persisted to localStorage.
 * On native iOS, this requests notification permission on first enable.
 * On web/dev mode, all calls are no-ops.
 */

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const PREF_KEY = "swipecat:daily-notif:v1";
const NOTIFICATION_ID = 9001; // Stable ID so we can cancel/replace

/** Curiosity-gap messages — make them wonder what's waiting */
const CURIOSITY_MESSAGES = [
  { title: "SwipeCat", body: "Something in your feed is blowing up right now... 👀" },
  { title: "SwipeCat", body: "We found a hidden gem you haven't seen yet. 💎" },
  { title: "SwipeCat", body: "One product is getting all the attention today. Guess which one?" },
  { title: "SwipeCat", body: "A top-rated find just appeared in your feed. 🔥" },
  { title: "SwipeCat", body: "Your next favorite thing is waiting. Come find it. 🐱" },
];

/** Loss-aversion messages — make them fear missing out or losing their streak */
const LOSS_MESSAGES = [
  { title: "Don't break your streak! 🔥", body: "Swipe today to keep your SwipeCat streak alive." },
  { title: "Today's picks expire at midnight ⏰", body: "Fresh finds are waiting — don't let them disappear." },
  { title: "Your feed is getting stale 😬", body: "New products are in. Open SwipeCat before you miss them." },
  { title: "SwipeCat misses you 🐱", body: "It's been a while. Your streak is at risk — swipe now!" },
  { title: "Last chance today 🚨", body: "Today's curated picks are almost gone. Swipe before midnight." },
];

/** Pick a message — alternate between curiosity and loss-aversion for variety */
function pickMessage(): { title: string; body: string } {
  // Use day-of-year parity to alternate message types
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const pool = dayOfYear % 2 === 0 ? CURIOSITY_MESSAGES : LOSS_MESSAGES;
  return pool[Math.floor(Math.random() * pool.length)];
}

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
    // Pick a psychologically-tuned message
    const msg = pickMessage();

    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_ID,
          title: msg.title,
          body: msg.body,
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

/** Key to track whether we've already suppressed today's notification */
const SUPPRESSED_KEY = "swipecat:daily-notif-suppressed:v1";

/** Get today's date as YYYY-MM-DD */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Suppress today's daily notification because the user already engaged.
 * Cancels the pending notification for today, then re-schedules for tomorrow
 * so the repeating cycle isn't broken.
 *
 * Safe to call multiple times per day — only acts once.
 */
export async function suppressTodaysNotification(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!isDailyNotifEnabled()) return;

  // Only suppress once per day
  try {
    const lastSuppressed = window.localStorage.getItem(SUPPRESSED_KEY);
    if (lastSuppressed === todayStr()) return;
    window.localStorage.setItem(SUPPRESSED_KEY, todayStr());
  } catch {
    // Ignore storage errors
  }

  // Cancel today's notification
  await cancelDailyNotification();

  // Re-schedule for tomorrow at 10 AM so the daily cycle continues
  try {
    const msg = pickMessage();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_ID,
          title: msg.title,
          body: msg.body,
          schedule: {
            on: {
              hour: 10,
              minute: 0,
            },
            repeats: true,
            allowWhileIdle: true,
          },
          sound: undefined,
          autoCancel: true,
        },
      ],
    });
  } catch (err) {
    console.error("Failed to re-schedule notification after suppression:", err);
  }
}

/**
 * Initialize notifications on app startup.
 * Re-schedules with a fresh message on every launch so the copy stays
 * varied (iOS clears scheduled notifications on app update).
 */
export async function initDailyNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!isDailyNotifEnabled()) return;

  // Enable (and request permission on first launch)
  await enableDailyNotifications();
}
