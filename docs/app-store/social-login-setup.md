# Social Login — Console Setup (Apple + Google)

The **code** for Sign in with Apple and Google is implemented in the app
(`AuthService.signInWithApple` / `signInWithGoogle`, `SocialAuthButtons`
component, wired into Welcome / Login / Signup). Before it works end-to-end you
must configure three consoles. This file is the checklist.

> ⚠️ Neither provider works in **Expo Go** or the iOS **Simulator** for Apple —
> you need a dev build / TestFlight build on a real device.

---

## Architecture (how the code works)
- **Apple:** native `expo-apple-authentication` → returns an `identityToken` →
  `supabase.auth.signInWithIdToken({ provider: 'apple', token })`.
- **Google:** `supabase.auth.signInWithOAuth({ provider: 'google' })` opens the
  Supabase-hosted consent page in an in-app browser
  (`WebBrowser.openAuthSessionAsync`), then returns to the app at
  **`voorcap://auth/callback`**, where the app finishes the session
  (handles both PKCE `code` exchange and implicit token fragment).

---

## 1. Supabase Dashboard → Authentication → Providers

### Apple
1. Enable **Apple**.
2. Add your iOS **bundle ID** (`com.voorcap.app`) to the "Client IDs" /
   "Authorized Client IDs" field. (Native token sign-in validates the audience
   against this.)
3. Save.

### Google
1. Enable **Google**.
2. Paste the **Web** OAuth client ID + secret from step 3 below.
3. Copy Supabase's **callback URL** shown here — looks like
   `https://<project-ref>.supabase.co/auth/v1/callback`. You need it in step 3.

### Redirect URLs (Authentication → URL Configuration)
Add to the **allow list**:
```
voorcap://auth/callback
voorcap://auth/reset-password
voorcap://
```
(`reset-password` is used by the in-app password-recovery flow — the app opens a
"set new password" screen when this link is tapped.)

---

## 2. Apple Developer (developer.apple.com)
1. **Certificates, IDs & Profiles → Identifiers →** your App ID
   (`com.voorcap.app`) → enable the **Sign In with Apple** capability.
2. That is all that's required for **native** iOS Sign in with Apple. (A Service
   ID + key is only needed for the *web/OAuth* Apple flow, which we do **not**
   use — we use the native token flow.)
3. `app.json` already sets `ios.usesAppleSignIn: true` and includes the
   `expo-apple-authentication` plugin, so EAS adds the entitlement at build time.

## 3. Google Cloud Console (console.cloud.google.com)
1. **APIs & Services → OAuth consent screen** → configure (External), add app
   name, support email, and the `voorcap.com` domain.
2. **APIs & Services → Credentials → Create OAuth client ID → Web application.**
   - Authorized redirect URI: the Supabase callback URL from step 1
     (`https://<project-ref>.supabase.co/auth/v1/callback`).
   - Copy the **Client ID** and **Client secret** → paste into Supabase (step 1).
3. (Optional, only if you later switch Google to the *native* SDK: also create
   an **iOS** OAuth client. Not needed for the current web-flow implementation.)

---

## 4. Build & test
```bash
eas build --profile development --platform ios   # or preview
```
Install on a real device, then:
- Tap **Continue with Apple** → native sheet → lands logged in.
- Tap **Continue with Google** → in-app browser → consent → back to app logged in.

## Notes
- First Apple sign-in returns the user's name **once** — the app captures it into
  the Supabase user metadata / profile on that first call.
- If Google returns to the browser but the app doesn't log in, the redirect URL
  is almost always the culprit — confirm `voorcap://auth/callback` is in the
  Supabase allow list and the scheme matches `app.json` (`"scheme": "voorcap"`).
