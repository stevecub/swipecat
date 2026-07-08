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
      presentationOptions: ["badge", "sound", "banner", "list"],
    },
  },
};

export default config;
