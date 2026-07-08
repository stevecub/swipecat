import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.swipecat",
  appName: "SwipeCat",
  webDir: "dist-capacitor",
  ios: {
    // "never" = WebView fills the entire screen edge-to-edge.
    // Safe areas are handled purely in CSS via env(safe-area-inset-*).
    contentInset: "never",
    backgroundColor: "#FFFFFF",
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: "#E5306B",
      iosSpinnerStyle: "small",
      spinnerColor: "#FFFFFF",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      // true = WebView renders behind the status bar (full-screen).
      overlaysWebView: true,
    },
    LocalNotifications: {
      presentationOptions: ["badge", "sound", "banner", "list"],
    },
  },
};

export default config;
