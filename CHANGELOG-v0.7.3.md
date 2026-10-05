# Allergy Guard v0.7.3

- Simplified email backup to use the mail app already installed on the phone.
- Removed Gmail / Microsoft OAuth, Google Cloud, Microsoft Entra, and GitHub OAuth variables.
- No email password is stored in the app.
- The app creates one encrypted `.agbackup` file, pre-fills the recipient, subject, body, and attachment, then opens the device mail composer.
- User only needs to press Send in Gmail, Outlook, Yahoo, or another configured mail app.
- Kept optional 24-hour local reminder for backups.
- Added restore-from-file flow using the system document picker.
- Removed background-mail and Nitro Google Sign-In dependencies that complicated Android builds.
- Version bumped to 0.7.3.
