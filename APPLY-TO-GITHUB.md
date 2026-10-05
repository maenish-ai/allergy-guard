# Apply v0.7.0 to the repository

This package is based on `maenish-ai/allergy-guard` main at commit:
`320e9967e15d5dd12467ef5515c0bbb23a3bc0d6` (v0.6.9).

Copy/overwrite the files in this ZIP at the same paths in the repository root.

Then make sure `package.json` contains:
- `"version": "0.7.0"`
- dependency `"expo-mail-composer": "~15.0.8"`

The existing GitHub workflow already runs `pnpm install --no-frozen-lockfile`, so it will resolve the new Expo package during the build.

Files in this update:
- `app/(tabs)/settings.tsx`
- `components/persistent-save-banner.tsx`
- `lib/email-backup.ts`
- `app.config.ts`
- `package.json`
- `CHANGELOG-v0.7.0.md`
