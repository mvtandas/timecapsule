# Voorcap — Privacy (App Store Connect "Nutrition Label")

Answers for **App Store Connect → App Privacy**. Based on a scan of the codebase
on 2026-07-12: backend is **Supabase**; there are **no analytics, ads, or
tracking SDKs** installed. Verify before final submission.

## Summary
- **Do you or your partners use data for tracking?** → **No**
  (no ad SDKs, no cross-app tracking; `expo-tracking-transparency` is not installed).
- **Is data collected linked to the user's identity?** → **Yes** (account-based app).

## Data types collected

| Apple data type | Collected? | Linked to user | Used for | Source in code |
|---|---|---|---|---|
| **Email Address** | Yes | Yes | App Functionality, Account Management | Supabase auth + `profiles.email` |
| **Name** (display name / username) | Yes | Yes | App Functionality | `profiles.display_name`, `username` |
| **Photos or Videos** | Yes | Yes | App Functionality | `expo-image-picker`, cap media |
| **Other User Content** (caps, messages, comments) | Yes | Yes | App Functionality | capsules / comments / messages tables |
| **Precise Location** | Yes | Yes | App Functionality | `expo-location`, caps dropped on map |
| **User ID** | Yes | Yes | App Functionality | Supabase auth user id |
| **Customer Support / other contact** | Optional | Yes | Support | `mailto:support@voorcap.app` |

> **Not collected:** Usage Data, Diagnostics/Crash data, Contacts, Browsing
> History, Search History, Financial Info, Health, Advertising Data. (No SDKs
> that would gather these are present. Re-check if you add analytics or IAP.)

## Notes for the reviewer questionnaire
- **Location** → "Precise" (the app requests `WhenInUse` and uses fine location
  to pin caps). Purpose: **App Functionality** only.
- **Push notifications** use a device push token (`expo-notifications`). This is
  not one of Apple's declarable "data types" and is used only to deliver
  notifications — not for tracking.
- Account deletion is implemented in-app (Settings → Delete Account), satisfying
  Guideline 5.1.1(v). Data is removed from Supabase; see `AuthService.deleteAccount`.

## iOS Privacy Manifest (`PrivacyInfo.xcprivacy`)
- Expo (SDK 54) **auto-generates** a privacy manifest for its own modules during
  prebuild, and recent `@react-native-async-storage/async-storage` ships its own.
  You generally do **not** need to hand-write one.
- **Action:** after `eas build`, verify the generated `PrivacyInfo.xcprivacy` in
  the built `.ipa` declares the "required reason" APIs (UserDefaults `CA92.1`,
  File Timestamp `C617.1`, etc.). If Apple emails an ITMS-91053 "missing API
  declaration" notice, add the missing reason via `ios.privacyManifests` in
  `app.json` and rebuild. Do not add it speculatively — declare only what's used.

## Required legal URLs (already wired in Settings → Support)
- Privacy Policy: `https://voorcap.com/privacy` — **must be live before submit**
- Terms of Service: `https://voorcap.com/terms` — **must be live before submit**
