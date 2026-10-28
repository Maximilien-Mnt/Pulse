# ✅ Consent Management Checklist

> Map of consent mechanisms, gate locations, and confirmation status. Supports GDPR Art. 7 (conditions for consent), Art. 8 (children), and CNIL guidance.

---

## 1. Consent required mechanisms

| # | Mechanism | Gate | Client location | Legal doc | Status |
|---|---|---|---|---|---|
| 1 | Analytics (PostHog) | `acceptPrivacy` checkbox; `getSignupMissingFields({ acceptTerms, acceptPrivacy })` blocks `onSubmit` | `app/auth/signup/step5.tsx` | `02-politique-confidentialite.md` (§6) | ✅ **Gate confirmed** (verified in `onSubmit` code path) |
| 2 | Cookie policy page | Dedicated cookie & tracker policy page (`legal/03-politique-cookies.md`) linked from settings | `legal/03-politique-cookies.md`, `lib/legalMeta.ts`, `lib/legalDocuments.ts`, `scripts/generate-legal-content.js`, `app/(tabs)/profile/settings.tsx` | `02-politique-confidentialite.md` (§11), `03-politique-cookies.md` | ✅ **Created** — cookie policy page registered and linked from settings |
| 2b | Push notifications | Native iOS/Android push permission prompt (`expo-notifications.requestPermissionsAsync`) | `hooks/usePushNotifications.ts` | `02-politique-confidentialite.md` (§6) + app store description | ⚠️ **Verify wording** — native permission UI may not reference Pulse's privacy policy; legal to confirm |
| 3 | Profile visibility (public profile) | Two-step confirmation (`GoPublicSheet` — irreversible) | `app/(tabs)/profile/edit-public` + `GoPublicSheet.tsx` | `02-politique-confidentialite.md` (§4) | ✅ **Confirmed** — warning that it is irreversible |
| 4 | Location services (geocoding/neighbor features) | Native location permission (future) | Not yet implemented (Nominatim geocoding is server-side) | `02-politique-confidentialite.md` (§4) | ⏳ Future — ensure consent gate before implementation |
| 5 | Bug report device context | Opt-in section (`BugReportSheet.tsx` “data collection notice”) | `components/shared/BugReportSheet.tsx` (`showDataDetails` expandable) | `02-politique-confidentialite.md` (§3) | ✅ **Confirmed** — data collection notice is presented before submit |

---

## 2. Consent wording resolution

| Source | Recommended text | Status |
|---|---|---|
| `02-politique-confidentialite.md` | “Nous pouvons utiliser vos données à des fins de personnalisation et d'analyse uniquement avec votre consentement explicite.” | 📄 Draft — legal to finalize |
| Analytics consent | “Vos données d'analyse ne sont pas utilisées jusqu'à ce que vous y consentez.” (already implemented via gate) | ✅ Verified in code |
| Push notification consent | Proposed: “Autoriser les notifications push pour recevoir des messages, des rappels d'événements et des invitations de clubs.” | ❓ Legal to confirm |

---

## 3. Attestation checklist

| Item | Verified | Evidence |
|---|---|---|
| Analytics gated by consent checkbox | ✅ | `step5.tsx`: `getSignupMissingFields({ acceptTerms, acceptPrivacy })` blocks `onSubmit` |
| Clear rejection path (no analytics if not consented) | ✅ | `analyticsConsent.ts` returns early; `posthog.ts` uses distinctive `sessionId` override |
| Consent text linked in settings (legal docs) | ✅ | `settings.tsx` → `/(tabs)/profile/legal` → `02-politique-confidentialite.md` |
| Demographic location consent | ⏳ | Server-side geocoding only; no user location persisted yet |
| Push consent wording | ⚠️ | Native permission requires legal review |
| Irreversible actions confirmed | ✅ | `GoPublicSheet` + `DeleteAccountSheet` both show irreversible warnings |

---

## 4. Open items to close before release

1. **Confirm push-notification consent text** against iOS/Android App Store guidelines and internal policy.
2. **Add a “Analytical cookies”/“Analytics” consent preference centre** (visible in settings) for users to withdraw consent post-signup (GDPR Art. 7(3) — right to withdraw).
3. **Add an analytics consent withdrawal button** in settings that disables future PostHog captures while retaining a non-personalized sessionId.
4. **Review `translations.ts`** for the exact consent wording strings to align with the legal document.
