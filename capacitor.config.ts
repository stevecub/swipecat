import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.swipecat",
  appName: "SwipeCat",
  webDir: "dist-capacitor",
  ios: {
    // "automatic" lets the WebView extend edge-to-edge; CSS env() handles insets.
    // "always" was causing double safe-area padding (native + CSS).
    contentInset: "automatic",
    backgroundColor: "#FFFFFF",
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      // Keep splash visible until SplashScreen.hide() is called from JS.
      // With launchAutoHide:true the splash hides after 1200ms regardless
      // of whether React has mounted — leaving a white WKWebView behind it.
      launchAutoHide: false,
      backgroundColor: "#E5306B",
      iosSpinnerStyle: "small",
      spinnerColor: "#FFFFFF",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      // true = WebView renders behind the status bar (edge-to-edge).
      // CSS env(safe-area-inset-top) in header handles the notch/Dynamic Island.
      overlaysWebView: true,
    },
    LocalNotifications: {
      // iOS: show badge, play sound, and display as banner + in notification center
      presentationOptions: ["badge", "sound", "banner", "list"],
    },
  },
};

export default config;
