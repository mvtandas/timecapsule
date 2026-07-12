# Voorcap — App Store Submission Checklist

Master checklist mapping the submission requirements to their status in the
codebase. ✅ done in code · 🟠 needs console/account action (can't be done from
code) · ⚠️ decision needed.

See also: [`metadata.md`](./metadata.md) · [`privacy.md`](./privacy.md) ·
[`social-login-setup.md`](./social-login-setup.md)

---

## Login & Register
| Item | Status | Where |
|---|---|---|
| Apple sign-in | ✅ code / 🟠 console | `AuthService.signInWithApple`, `SocialAuthButtons`; needs Apple Developer + Supabase config → `social-login-setup.md` |
| Google sign-in | ✅ code / 🟠 console | `AuthService.signInWithGoogle`; needs Google Cloud + Supabase config → `social-login-setup.md` |
| App metadata / description / keywords | 🟠 console | Draft ready in `metadata.md` — paste into App Store Connect |
| Privacy information (nutrition label) | 🟠 console | Answers ready in `privacy.md` |
| Screenshots / previews | 🟠 manual | Capture list in `metadata.md` |
| App Review full access | 🟠 console | Create a demo account (below) and enter it in App Review Information |

## ⚠️ FIRST: apply the report/block database migration
The reporting/blocking tables were only defined in the old, out-of-series
`012_report_block.sql`, so on a DB built from the canonical `0001+` series they
may be **missing** — which silently breaks all Safety features. Before relying on
them:
1. Run **`db/migrations/0012_report_block.sql`** in the Supabase SQL editor
   (idempotent; also tightens the RLS from `USING (true)` to per-user).
2. Verify with: `select to_regclass('public.reports'), to_regclass('public.blocked_users');`
   (both should be non-null).

## Safety  (Apple Guideline 1.2 — required for UGC apps)
| Item | Status | Where |
|---|---|---|
| Reporting mechanism | ✅ | `ReportService.reportContent` — capsules, comments, users |
| Criminal Activity report reason | ✅ | Added to `REPORT_REASONS` (`reportService.ts`) |
| Block abusive users | ✅ | `ReportService.blockUser`; blocked content filtered from feeds (`capsuleService.ts`) |
| Manage blocked users (view / unblock) | ✅ | New `BlockedUsersScreen`, linked from Settings → Account |
| Support & help (email) | ✅ | Settings → Help & Support opens `mailto:support@voorcap.app` |
| EULA / terms acceptance | ✅ | Shown on signup; Terms + Privacy links in Settings |

## Performance
| Item | Status | Notes |
|---|---|---|
| TestFlight build | ✅ config / 🟠 run | `eas.json` added; run the commands below |
| Background services permission | ✅ no action | App uses **remote push** (`expo-notifications`, token in `src/lib/notifications.ts`) and requests notification permission through the standard flow. There are **no background execution modes** (no background fetch / TaskManager / background location / silent push), so no `UIBackgroundModes` and no extra permission system are needed. Only console step: enable the **Push Notifications** capability + APNs key in Apple Developer / EAS credentials. |

## Payments
- No in-app purchases exist yet — nothing to declare. **When IAP is added**,
  re-check Apple **Guideline 3.1.1** (must use StoreKit for digital goods) and
  re-do the privacy label + App Review notes. *(This is the "3. Madde" note.)*

---

## ✅ Bundle Identifier — decided
- Set to **`com.voorcap.app`** (iOS `bundleIdentifier` + Android `package` in
  `app.json`) for brand consistency, on 2026-07-12, before any TestFlight upload.
- Register the App ID `com.voorcap.app` in Apple Developer and create the App
  Store Connect app record under this ID. Use the same ID in the Supabase Apple
  provider "Client IDs" field.
- The Expo `slug` (`time-capsule`) is intentionally left unchanged — it ties to
  the existing EAS project, not the store identity.

## Demo account for App Review
The app is auth-gated, so App Review needs working credentials:
1. Create a normal account in the app (e.g. `review@voorcap.app`).
2. Seed it with a few public caps so reviewers see real content.
3. Enter the email + password under **App Store Connect → App Review
   Information → Sign-In required**.
4. Add a note: how to drop a cap, that some caps are intentionally sealed until a
   future date, and where report/block live (long-press a cap / user profile).

## EAS build & submit
Prereqs: `npm i -g eas-cli`, then `eas login`. Fill the `submit.production.ios`
placeholders in `eas.json` (Apple ID email, ASC app id, Apple team id).

```bash
# One-time: create iOS credentials (Push + Sign in with Apple capabilities)
eas credentials --platform ios

# Build for TestFlight
eas build --profile production --platform ios

# Upload to App Store Connect / TestFlight
eas submit --profile production --platform ios
```

`eas.json` uses `appVersionSource: remote` + `autoIncrement`, so the iOS build
number bumps automatically on each production build — no manual edits.

> Social login (Apple native + Google) requires a real build — it does **not**
> work in Expo Go or the iOS Simulator. Use a `development` or `production` build
> on a real device to test.
