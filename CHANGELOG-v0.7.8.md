# v0.7.8

- GitHub Actions build stability update.
- Removed automatic in-progress cancellation so an Android build is not marked cancelled when another repository commit arrives during the build.
- Kept the Android-safe `expo-crypto` PRNG fix for encrypted backups.
- Added a CI guard to verify `package.json` and `app.config.ts` versions match.
- No patient-data schema or Android package-name changes.
