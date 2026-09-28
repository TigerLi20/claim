# College Hill Market mobile release checklist

The website remains on `main`. The iOS and Android projects, shared API changes, and web changes live on `feature/college-hill-mobile`. Do not merge or deploy this branch until the checks below pass. The web and app use the same accounts, listings, conversations, safety controls, and API.

## Setup needed from the owner

1. The public backend URL is `https://webservice-claim.onrender.com`; `/health` returned `{"ok":true}` during setup. Copy `claimco-frontend/.env.mobile.example` to `.env.mobile`. The Vite build embeds this public URL into the native app. Recheck it before release if backend hosting changes.
2. In Firebase Console, create one project and register Android app `com.collegehillmarket.app` and iOS app `com.collegehillmarket.app`. Download `google-services.json` into `claimco-frontend/android/app/` and `GoogleService-Info.plist` into `claimco-frontend/ios/App/App/`. Add the iOS plist to the Xcode app target. These files are gitignored. In Apple Developer, create an APNs authentication key and upload it to Firebase Cloud Messaging. Enable Push Notifications for the iOS app in Xcode. Keep the APNs key private.
3. Give the backend access to Firebase Admin using either `FIREBASE_SERVICE_ACCOUNT_JSON` (the service account JSON in one environment variable) or `GOOGLE_APPLICATION_CREDENTIALS` (a server-side file path). Never put the service account in frontend env vars or the repository. Redeploy the backend. Push delivery is dormant until credentials are configured.
4. Install full Xcode 26+ and Android Studio with SDK 36. This Mac currently has only Xcode Command Line Tools and no Android SDK. Sign in to Apple Developer and Google Play Console in those tools. Have one iPhone and one Android phone available for physical-device tests.
5. Create a dedicated review account with an email inbox you control. Share the account email and an active login-code method privately with store reviewers in their review notes. Do not publish a fixed review code in the app or repository. Provide access to a few real or sample listings and chats without exposing other users' private messages.

## Build and verify

From `claimco-frontend` run `npm install`, `npm run assets:mobile`, then `npm run sync:mobile`. Open `ios/App/App.xcodeproj` in Xcode and `android/` in Android Studio. On iOS, enable Push Notifications, check signing and APNs configuration, and build/archive. On Android, verify the Firebase JSON is present, configure a release signing key held outside the repo, and build an Android App Bundle. Keep signed `.ipa` and `.aab` files private until submission.

Run the same workflow on the website and both devices: guest browse → school-email register → verify code → create listing with photo → browse item → inquire → send/reply to chat → receive push after opting in → report listing/message → block/unblock → mark sold → delete account. Test login persistence after force quit, failed/expired codes, offline API errors, Android back navigation, iOS safe areas, and notification tap to the correct conversation. Use two accounts and devices for chat and push. Re-run backend tests, frontend build and lint, and check the production `/health` endpoint after deployment.

## Store assets and disclosures

The branch includes a College Hill Market icon and a script to regenerate iOS and Android icons. Capture screenshots from the tested physical devices or store simulators after the live API is configured. Suggested scenes: browse grid, item detail, sell form, chat, account safety controls. Use actual app screens and current store sizes; do not fabricate transactions or messages from real users. Store description should say that College Hill Market is an independent student marketplace, unaffiliated with Brown or RISD, and that buyers and sellers arrange payment themselves.

App Store privacy and Google Play Data safety answers must reflect the deployed build: school email, name, phone, profile details, listing photos and text, messages, reports/blocks, device push token, and existing website analytics. Mark account creation and account deletion as available. The public deletion URL is `https://<website-domain>/delete-account`; the privacy URL is `/privacy` and terms URL is `/terms`. Confirm exact retention and third-party processor answers against the production database, backups, Cloudinary, email provider, Umami, and Firebase before submission.

Recheck SDK, target API, store review, screenshot, privacy, and account-deletion requirements immediately before submitting. No store package is ready until owner configuration, signed builds, and physical-device tests are complete.
