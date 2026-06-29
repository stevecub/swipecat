/**
 * useNetwork — reliable online/offline detection for Capacitor iOS apps.
 *
 * Combines three signals for maximum reliability:
 * 1. @capacitor/network plugin listener (native reachability)
 * 2. Browser navigator.onLine + window online/offline events
 * 3. Periodic polling fallback (every 10s when offline) to catch cases
 *    where the Capacitor plugin fails to fire the "back online" event on iOS
 *
 * Returns { isOnline, isChecking } where:
 * - isOnline: current network status (true = connected, false = offline)
 * - isChecking: true during initial status check on mount
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";

/** How often to poll when we think we're offline (ms) */
const OFFLINE_POLL_INTERVAL = 10_000;

export function useNetwork() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [isChecking, setIsChecking] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Polling fallback: when offline, periodically check if we're back
  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const status = await Network.getStatus();
          if (status.connected) {
            setIsOnline(true);
            stopPolling();
          }
        } else if (navigator.onLine) {
          setIsOnline(true);
          stopPolling();
        }
      } catch {
        // Ignore — will retry next interval
      }
    }, OFFLINE_POLL_INTERVAL);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    let listenerHandle: { remove: () => void } | null = null;

    async function init() {
      // Get initial status
      try {
        if (Capacitor.isNativePlatform()) {
          const status = await Network.getStatus();
          setIsOnline(status.connected);
          if (!status.connected) startPolling();
        } else {
          setIsOnline(navigator.onLine);
          if (!navigator.onLine) startPolling();
        }
      } catch {
        // Fallback to navigator.onLine
        setIsOnline(navigator.onLine);
      }
      setIsChecking(false);

      // Listen for changes via Capacitor Network plugin
      if (Capacitor.isNativePlatform()) {
        try {
          const handle = await Network.addListener("networkStatusChange", (status) => {
            setIsOnline(status.connected);
            if (!status.connected) {
              startPolling();
            } else {
              stopPolling();
            }
          });
          listenerHandle = handle;
        } catch {
          // Plugin not available — rely on browser events
        }
      }

      // Also listen to browser online/offline events as a secondary signal
      const handleOnline = () => {
        setIsOnline(true);
        stopPolling();
      };
      const handleOffline = () => {
        setIsOnline(false);
        startPolling();
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }

    let cleanupBrowser: (() => void) | undefined;
    init().then((cleanup) => {
      cleanupBrowser = cleanup;
    });

    return () => {
      stopPolling();
      listenerHandle?.remove();
      cleanupBrowser?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isOnline, isChecking };
}
