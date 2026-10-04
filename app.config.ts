import type { ExpoConfig } from "expo/config";

const version = "0.6.4";
const [major, minor, patch] = version.split(".").map(Number);
const versionCode = major * 10000 + minor * 100 + patch;

const config: ExpoConfig = {
  name: "حارس الحساسية",
  slug: "allergy-guard-android",
  owner: "malak-new",
  version,
  extra: {
    eas: {
      projectId: "f76f024e-f713-4353-a694-f56589537c1d",
    },
  },
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "allergyguard",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  android: {
    package: "com.mkassis37.allergyguard",
    versionCode,
    edgeToEdgeEnabled: true,
    adaptiveIcon: {
      backgroundColor: "#E8F4F5",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  ios: { supportsTablet: true, bundleIdentifier: "com.mkassis37.allergyguard" },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#F5FAFB",
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: { typedRoutes: true, reactCompiler: false },
};

export default config;
