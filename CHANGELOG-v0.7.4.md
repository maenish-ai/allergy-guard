# Allergy Guard v0.7.4

- Fixed the GitHub Actions TypeScript failure seen in v0.7.3.
- Root cause: three legacy OAuth/background-mail source files remained in the GitHub repository after the simplified-email upload; uploading replacement files does not automatically delete repository files that disappeared from the ZIP.
- Added safe compatibility shims for `lib/email-account.ts`, `lib/email-mailbox.ts`, and `lib/auto-email-backup.ts` so stale repository files are overwritten and can no longer import removed packages.
- Kept the simple, free email-backup flow: encrypted `.agbackup` + the phone's installed mail composer + user presses Send.
- No Google Cloud, Microsoft Entra, OAuth client IDs, background-mail packages, or email passwords are required.
- Added a CI guard that rejects accidental reintroduction of the removed legacy package imports.
- Updated the obsolete OAuth setup document and `.env.example` to match the simplified flow.
- Version bumped to 0.7.4 (`versionCode` 704).
