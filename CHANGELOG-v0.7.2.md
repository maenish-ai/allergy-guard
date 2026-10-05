# Allergy Guard v0.7.2

## CI / Android build fix

- Fixed the GitHub Actions failure at **Generate Android project**.
- Root cause: the `react-native-nitro-google-signin` Expo config plugin required iOS Google configuration even during an Android-only prebuild.
- The plugin is now enabled only when `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` is configured.
- Android keeps Google Sign-In native autolinking and uses the explicit Web Client ID at runtime.
- Added an Expo-config validation step before Android prebuild so config problems fail earlier and with a clearer signal.
- No patient data format or Android package name was changed.

Version: 0.7.2
Package: `com.mkassis37.allergyguard`
