/**
 * Native storage abstraction.
 *
 * On iOS (Capacitor), uses @capacitor/preferences which maps to
 * native UserDefaults — data persists even if WKWebView storage is
 * cleared by the OS under storage pressure.
 *
 * On web, falls back to localStorage.
 *
 * All methods are async to accommodate the Capacitor plugin's async API.
 */

import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const isNative = Capacitor.isNativePlatform();

export async function nativeGet(key: string): Promise<string | null> {
  if (isNative) {
    const { value } = await Preferences.get({ key });
    return value;
  }
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

export async function nativeSet(key: string, value: string): Promise<void> {
  if (isNative) {
    await Preferences.set({ key, value });
    return;
  }
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
}

export async function nativeRemove(key: string): Promise<void> {
  if (isNative) {
    await Preferences.remove({ key });
    return;
  }
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}
