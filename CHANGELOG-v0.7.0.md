# Allergy Guard v0.7.0

## Save UX
- Removed the redundant middle save banner from add/edit forms.
- Kept the compact header save action and the large bottom save button.
- Existing Android navigation-safe bottom spacing remains unchanged.

## Encrypted email backup
- Added email backup settings for Gmail, Outlook/Hotmail, Yahoo, and other email addresses.
- Creates an encrypted `.agbackup` archive containing the complete local v2 patient store (all patients + records).
- Backup encryption uses PBKDF2-SHA256 (210,000 iterations) and XSalsa20-Poly1305.
- Backup password is stored with Expo SecureStore, not AsyncStorage.
- Added "Backup now and email it" using the device's configured mail application.
- Keeps up to 7 local encrypted backup files.
- Added optional 24-hour local reminder to send a fresh backup.

## Important behavior
The app does not store the user's Gmail/Outlook/Yahoo password. Provider-independent silent background sending is intentionally not claimed: modern providers require provider-specific OAuth/server-side credentials for unattended sending. v0.7.0 uses the device mail client so it works safely with any configured provider after user confirmation.
