import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.swipecat",
  appName: "SwipeCat",
  webDir: "dist-capacitor",
  ios: {
    contentInset: "always",
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
      overlaysWebView: false,
    },
    LocalNotifications: {
      // iOS: show badge, play sound, and display as banner + in notification center
      presentationOptions: ["badge", "sound", "banner", "list"],
    },
  },
};

export default config;
