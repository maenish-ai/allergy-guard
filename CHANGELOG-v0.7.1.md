# Allergy Guard v0.7.1

## Email account connection and restore

- Added Google Credential Manager integration through `react-native-nitro-google-signin` for Gmail authorization on Android.
- Added Microsoft OAuth 2.0 Authorization Code + PKCE for Outlook / Hotmail.
- The application never stores the user's Gmail, Outlook, Yahoo, or other mailbox password.
- Added direct encrypted-backup sending through Gmail API or Microsoft Graph after the account is connected.
- Added **Restore latest backup from email** for linked Gmail and Outlook / Hotmail accounts.
- Restore previews the backup date and patient count and requires explicit confirmation before replacing local data.
- Added a 24-hour minimum background task for linked Gmail / Outlook automatic backups, plus an overdue check on app startup.
- Kept the manual encrypted-email route for Gmail, Outlook, Yahoo, and other mail providers.
- Yahoo remains manual for mailbox access because a general Yahoo Mail REST API suitable for a secret-free Android client is not available; no Yahoo client secret is embedded in the APK.
- Added GitHub Actions environment variables for Google Web Client ID and Microsoft Client ID.
- Kept the simplified save UI from v0.7.0: one compact save action in the header plus the large bottom save button.

## Version

- App version: `0.7.1`
- Android package: `com.mkassis37.allergyguard`
- `versionCode` remains monotonic using the existing formula.
