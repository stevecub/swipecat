import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import {
  isDailyNotifEnabled,
  enableDailyNotifications,
  disableDailyNotifications,
} from "@/lib/daily-notifications";

/**
 * A compact toggle card for enabling/disabling daily pick notifications.
 * Shows a bell icon, label, and an iOS-style toggle switch.
 */
export function DailyPicksToggle() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEnabled(isDailyNotifEnabled());
  }, []);

  const handleToggle = useCallback(async () => {
    setLoading(true);
    try {
      if (enabled) {
        await disableDailyNotifications();
        setEnabled(false);
      } else {
        const success = await enableDailyNotifications();
        setEnabled(success);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-border transition active:scale-[0.98] disabled:opacity-60"
      aria-pressed={enabled}
    >
      <div className={`rounded-full p-2 ${enabled ? "bg-primary/10" : "bg-muted"}`}>
        {enabled ? (
          <Bell className="h-5 w-5 text-primary" />
        ) : (
          <BellOff className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-semibold text-foreground">Daily Picks</p>
        <p className="text-[11px] text-muted-foreground">
          Get a daily reminder at 10 AM with fresh product picks
        </p>
      </div>
      {/* iOS-style toggle */}
      <div
        className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${
          enabled ? "bg-primary" : "bg-gray-300"
        }`}
      >
        <div
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
            enabled ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
  );
}
