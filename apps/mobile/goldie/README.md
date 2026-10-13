# Store screenshots

Made with [goldie](https://github.com/software-mansion-labs/goldie). The app in
the screenshots talks to a local demo server with invented data — never to
production, so no real user appears on a store page.

## Regenerate

1. Demo server on port 3210, on a throwaway local Postgres (from `apps/web`):

   ```bash
   DB='postgresql://e2e:e2e@localhost:54329/dastiyor_e2e?schema=public'
   POSTGRES_PRISMA_URL="$DB" POSTGRES_URL_NON_POOLING="$DB" E2E_PORT=3210 \
     BREVO_API_KEY= PAYOM_API_HOST= PAYOM_API_TOKEN= UPSTASH_REDIS_REST_URL= KV_REST_API_URL= \
     NEXT_PUBLIC_SUBSCRIPTIONS_ENABLED=false SUBSCRIPTION_GATE_ENABLED=false \
     node e2e/support/start-server.mjs
   ```

   It uses the e2e suite's database folder, so do not run `test:e2e:all` at the same time.

2. Demo data (from `apps/mobile`):

   ```bash
   POSTGRES_PRISMA_URL="$DB" node goldie/demo/seed.mjs
   ```

3. An iOS simulator Release build pointed at that server (from `apps/mobile/ios`,
   after `npx expo prebuild`):

   ```bash
   EXPO_PUBLIC_API_URL=http://localhost:3210 SENTRY_DISABLE_AUTO_UPLOAD=true \
     xcodebuild -workspace Dastiyor.xcworkspace -scheme Dastiyor -configuration Release \
     -sdk iphonesimulator -derivedDataPath build/dd -destination 'generic/platform=iOS Simulator' build
   ```

4. Capture and render (from `apps/mobile`):

   ```bash
   export GOLDIE_CONFIG=$PWD/goldie/goldie.config.ts
   npx -y goldie@0 capture && npx -y goldie@0 frame && npx -y goldie@0 manifest && npx -y goldie@0 verify
   npx -y goldie@0 studio      # http://localhost:4321
   ```

   Add `npx -y goldie@0 preview` before `manifest` for the App Store preview video.

   The Tajik set is the same with `GOLDIE_CONFIG=$PWD/goldie/tj/goldie.config.ts`;
   its flows (`store-tj-*`) switch the app to Tajik first. Run one set at a time.

Output: `goldie/out/` (Russian) and `goldie/tj/out/` (Tajik), each with
`screenshots/<device>/<locale>/` and `previews/<device>/<locale>/preview.mp4`. Headlines, colours and screen
order are in `goldie.config.ts`; how each screen is reached is in
`.argent/flows/store-*.yaml`.

The ten screen flows for both languages are written by `goldie/demo/gen-flows.py`
(run from `apps/mobile`); edit the template there rather than twenty files. The
sign-in, sign-out and preview flows are written by hand.

## Android

Not set up yet. `pixel-10-pro` needs a release APK that can reach the demo
server, which means a build that allows plain HTTP to localhost (the store
build does not, and should not).
