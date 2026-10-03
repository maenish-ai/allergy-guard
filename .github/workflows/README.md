# Android CI

`android-preview.yml` builds the installable Android APK directly with Expo Prebuild + Gradle on the GitHub runner.

This workflow intentionally does **not** call `eas build`, so it does not require an `EXPO_TOKEN` GitHub secret or an interactive Expo login.

For Google Play production signing, use a dedicated release keystore / Play signing flow instead of this preview APK workflow.
