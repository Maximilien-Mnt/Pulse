# 🔄 End-to-End Data Flow Inventory

> Auto-generated from the Pulse codebase audit (client + Supabase + edge functions).  
> Purpose: support GDPR Art. 30 (records of processing), CNIL compliance checks, and the deletion/export workflow.

---

## 1. Flow: Signup → Account creation

| Step | Component | Data collected | Storage location | Category | Retention |
|---|---|---|---|---|---|
| 1 | `app/auth/signup/step1.tsx` | `email`, `password`, `fullName`, `username`, `language` | Supabase Auth + `profiles` | Personal data | Per retention schedule |
| 2 | `app/auth/signup/step2.tsx` | `birthDate`, `country`, `city` | `profiles` | Personal data | Per retention schedule |
| 3 | `app/auth/signup/step3.tsx` | `sportId`, `level`, `practice`, `timeSlots` | `user_sports` + `time_slots` | Personal data | Per retention schedule |
| 4 | `app/auth/signup/step4.tsx` | `interestedSports[]`, `objectives[]`, `heightCm`, `weightKg` | `user_objectives`, `profiles` | Personal data | Per retention schedule |
| 5 | `app/auth/signup/step5.tsx` | `bio`, `discovery`, `discoveryDetails`, `acceptTerms`, `acceptPrivacy` | `profiles` | Legal / marketing | Per retention schedule |
| 5b | Edge function `supabase/functions/signup/index.ts` | Full payload (validated); age ≥ 16 enforced | Server-side processing | — | — |
| 5c | PostHog (after consent gate) | `signup_step_completed` + metadata | PostHog (EU instance) | Analytics | Per PostHog retention |

---

## 2. Flow: Push notifications

| Step | Component | Data collected | Storage location | Category | Retention |
|---|---|---|---|---|---|
| 1 | `hooks/usePushNotifications.ts` | Expo push token (`push_token`) | `profiles.push_token` | Personal data | Per retention schedule |
| 2 | Edge function `send-notification/index.ts` | Notification type, title, body, deep-link data | `notifications` table + Expo API | Personal data | Per retention schedule |
| 3 | Client (`usePushNotifications`) | Notification received / response state | Local device (Expo native) | Personal data | Device storage |


---

## 3. Flow: Geocoding / location

| Step | Component | Data collected | Storage location | Category | Retention |
|---|---|---|---|---|---|
| 1 | `supabase/functions/geocode/index.ts` | Address string (`address`) | Nominatim (OpenStreetMap) API → JSON result; `latitude`/`longitude` in response only | Location data | Nominatim data policy |
| 2 | Server pool `sync-external-data` | External club/event data (OSM, OpenAgenda) | `external_clubs`, `events` (is_external=true) | External data | Per class |

**Note:** `utils/geolocation.ts` is a pure client-side Haversine distance helper. No personal location data is persisted client-side.

---

## 4. Flow: Messages / conversations (export)

| Step | Component | Data collected | Storage location | Category | Retention |
|---|---|---|---|---|---|
| 1 | `utils/conversationExport.ts` | Full message history of a conversation | Cache dir → JSONL file → native share sheet | Personal data | Per retention schedule |
| 2 | `supabase/migrations/001_initial.sql` RLS | `messages`, `conversation_participants`, `message_hidden` | `messages` table | Personal data | Per retention schedule |

**Note:** Export gated by RLS (`messages_select` via `conversation_participants`); only participants with `left_at IS NULL` can read.

---

## 5. Flow: Account deletion (hard delete)

| Step | Component | Action | Storage location | Category |
|---|---|---|---|---|
| 1 | `hooks/useDeleteAccount.ts` | Calls `supabase.rpc("delete_my_account", { p_password })` | — | — |
| 2 | RPC `public.delete_my_account(p_password)` (`supabase/migrations/030_hard_delete_account_(done).sql`) | Password verified with `pgcrypto.crypt()`; `DELETE FROM auth.users` cascades to `profiles` + all related tables | Supabase Auth → cascade | Personal data |
| 3 | `components/profile/DeleteAccountSheet.tsx` | UI + `onSuccess` → router.replace(`/auth/signin`) | — | — |

**Note:** Deletion is *immediate* (hard delete), per the Privacy Policy section 7 (30-day wording was superseded). The soft-delete plan in `implementation_plan.md` is a V1 artifact and is no longer deployed.

---

## 6. Flow: Bug reports

| Step | Component | Data collected | Storage location | Category |
|---|---|---|---|---|
| 1 | `components/shared/BugReportSheet.tsx` + `hooks/useBugReport.ts` | `message` + device context (platform, OS, app version, model, locale, screen res, timezone) | `bug_reports` table (`reporter_id`, `platform`, `os_version`, `app_version`, `device_model`, `locale`, `screen_resolution`, `timezone`) | Personal data (device context) |

---

## 7. Analytics & logging (post-consent)

| Step | Component | Data collected | Storage location | Category |
|---|---|---|---|---|
| 1 | `src/config/posthog.ts` | Session override + capture after consent gate | PostHog (EU instance) | Analytics |
| 2 | `lib/reporting/logger.ts` | Structured logs, PII-redacted | Server-side log aggregation | Operational |
| 3 | `lib/reporting/errorReport.ts` + `userMessage.ts` | Error payloads, redacted | Server-side error tracker | Operational |

---

## 8. Summary: personal-data inventory by category

| Category | Fields | Storage | Consent required? |
|---|---|---|---|
| Identity | email, password hash (Supabase), full name, username, language | Auth + profiles | Terms + privacy acceptance (mandatory) |
| Demographics & location | birth date, country, city | profiles | Geo/birth data per policy |
| Profile & interests | sport, level, practice, time slots, objectives, bio, avatar | profiles, user_sports, user_objectives | — |
| Notifications | push token, notification content | profiles.push_token, notifications | Per platform (iOS/Android push opt-in) |
| Communication | messages, conversation participants | messages | — |
| Device context (bug reports) | platform, OS, app version, model, locale, screen res, timezone | bug_reports | — |
| Analytics (post-consent) | `signup_step_completed` + metadata (sessionId override) | PostHog | Analytics consent (mandatory, gated) |
| External data | OSM clubs, OpenAgenda events | external_clubs, events | — |

**Note:** `send-notification` supports only a fixed allow-list of types; arbitrary `type` is rejected (400).
