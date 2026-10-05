# OAuth email setup for Allergy Guard v0.7.2

The Android project builds even if the OAuth client IDs are empty. When they are not configured, the settings screen keeps the encrypted manual-email backup available and explains what is missing.

The Nitro Google Sign-In Expo config plugin is intentionally enabled only when `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` is present. This prevents an Android-only prebuild from failing just because iOS Google OAuth has not been configured yet.

## Gmail / Google

The Android build uses `react-native-nitro-google-signin` (Google Credential Manager) instead of putting the Gmail password in the app or using an Android custom browser redirect.

1. Create/select a Google Cloud project and enable the Gmail API.
2. Configure the OAuth consent screen.
3. Create an **Android OAuth client** for:
   - Package: `com.mkassis37.allergyguard`
   - SHA-1: the SHA-1 of the same signing key used by your APK / Play build.
4. Create a **Web OAuth client** in the same Google project. The native library uses its Web Client ID when requesting Google API authorization.
5. In GitHub repository `Settings -> Secrets and variables -> Actions -> Variables`, create:
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
6. Only if you later build iOS, also create:
   - `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` = the reversed iOS client-id URL scheme (`com.googleusercontent.apps....`).
6. The app requests Gmail read-only and send scopes. A public production app may require Google OAuth verification because Gmail read access is a restricted scope.

No Gmail password or Google client secret is stored in the APK.

## Outlook / Hotmail / Microsoft

1. Register an application in Microsoft Entra.
2. Add a Mobile/Desktop application platform and allow public-client authorization-code + PKCE flow.
3. Register this redirect URI exactly:
   - `allergyguard://email-auth`
4. Add delegated Microsoft Graph permissions:
   - `User.Read`
   - `Mail.Read`
   - `Mail.Send`
5. In GitHub repository `Settings -> Secrets and variables -> Actions -> Variables`, create:
   - `EXPO_PUBLIC_MICROSOFT_OAUTH_CLIENT_ID`

The app requests `offline_access`, so it can refresh Microsoft tokens without asking for the mailbox password again.

## Yahoo

Yahoo OAuth requires application credentials, while Yahoo's current OAuth documentation does not expose a general Mail REST API comparable to Gmail API or Microsoft Graph for this use case. A Yahoo client secret must not be embedded in an Android APK. Therefore v0.7.2 deliberately keeps Yahoo on the secure manual route: the app creates the encrypted `.agbackup` file and opens the installed mail app for sending.

This is intentional; the app does not pretend that direct Yahoo mailbox search/restore is available when it is not.

## Automatic 24-hour backup

For a linked Gmail or Outlook account, the app registers Expo BackgroundTask with a 24-hour minimum interval. Android/WorkManager chooses the actual execution time, so it is approximately every 24 hours rather than an exact alarm. The app also checks for an overdue backup when it starts.
