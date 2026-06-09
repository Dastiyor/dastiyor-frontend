# Dastiyor Mobile — Store Release Guide

Workflow: **CNG / managed** (no committed `ios/` or `android/` folders — EAS prebuilds
native projects from `app.json`). Build & submit via **EAS**.

## What's already done (in code)

- App icon + splash from `assets/icon.png` / `assets/splash.png` (`app.json`).
- Bundle IDs: iOS `com.dastiyor.app`, Android `com.dastiyor.app`.
- iOS export compliance: `ios.config.usesNonExemptEncryption = false` (no yearly prompt).
- Apple Sign In: `ios.usesAppleSignIn` + `expo-apple-authentication` plugin (entitlement auto-added on prebuild).
- Android permissions trimmed to none beyond defaults.
- Deps aligned to SDK 54; `expo-font` added (was a missing peer → prod crash risk). `expo-doctor`: 18/18.
- **Account deletion** (App Store 5.1.1(v) + Google Play data-deletion): Profile → "Delete Account".
  - Mobile: `contexts/AuthContext.tsx` `deleteAccount()`, `app/(tabs)/profile.tsx`.
  - API: `apps/web/app/api/account/route.ts` (`DELETE`) — cascades user's tasks/responses/messages/reviews/etc. in a transaction.

## Prerequisites (your accounts — I can't create these)

- **Apple Developer Program** ($99/yr) + an app record in App Store Connect (bundle `com.dastiyor.app`).
- **Google Play Console** ($25 once) + a Play app + a **service-account JSON** for `eas submit`.
- **Expo account** (free): `npx eas login`.

## One-time setup

```bash
cd apps/mobile
npx eas login
npx eas init            # creates the EAS project, writes extra.eas.projectId into app.json
```

Fill `eas.json` → `submit.production`:
- iOS: `appleId`, `ascAppId` (App Store Connect app ID), `appleTeamId`.
- Android: place the service-account key at `apps/mobile/google-service-account.json` (git-ignored).

## Deploy the web API first

The mobile app talks to **https://www.dastiyor.com** (`lib/api-client.ts`).
Deploy `apps/web` to Vercel **before** release so `DELETE /api/account` exists.
No DB migration needed (route uses existing Prisma models).

## Build

```bash
cd apps/mobile
npx eas build -p ios --profile production       # → .ipa, managed signing
npx eas build -p android --profile production    # → .aab (app-bundle)
```

`production` profile already auto-increments build/version numbers (`appVersionSource: remote`).

## Submit

```bash
npx eas submit -p ios --latest
npx eas submit -p android --latest
```

## Store-listing tasks (manual, in the consoles)

- Privacy policy URL: https://dastiyor.com/privacy (already referenced).
- iOS: App Privacy questionnaire; screenshots; mention the in-app **Delete Account** path under "Account deletion".
- Android: Data safety form; add the account-deletion URL/flow; content rating; screenshots.

## Notes / gotchas

- **Local iOS builds** (`expo run:ios` / `expo prebuild`) on this Mac break because the repo path
  contains a space (`/Volumes/Office Drive/...`). EAS cloud builds are unaffected (no spaces).
  The `expo-constants` patch in `/patches` mitigates one case; a fresh `prebuild` locally would also
  reintroduce the React-Native bundle-script issue. **Recommend building via EAS**, or clone to a
  space-free path for local native builds.
- Re-run `npx expo-doctor` after any dependency change.
