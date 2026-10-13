# ⏱️ Data Retention Schedule

> Framework document. Retention periods are **proposed defaults** and must be confirmed by the data-protection officer / legal counsel. They support GDPR Art. 5(1)(e) (storage limitation) and CNIL guidance.

---

## 1. Personal data categories and proposed retention

| # | Category | Fields | Storage system | Proposed retention | Deletion trigger |
|---|---|---|---|---|---|
| 1 | Account credentials | email, password hash (Supabase) | Supabase Auth | Account deletion request → immediate hard delete (cascade) | Account deleted |
| 2 | Demographics | fullName, username, birthDate, country, city, language | profiles | Until account deletion | User request + cascade |
| 3 | Sports profile | sportId, level, practice, timeSlots | user_sports / time_slots | Until account deletion | User request + cascade |
| 4 | Interests & objectives | interestedSports[], objectives[], heightCm, weightKg, bio | profiles, user_objectives | Until account deletion | User request + cascade |
| 5 | Discovery source | discovery, discoveryDetails | profiles | 24 months after last login | Inactivity timeout |
| 6 | Push notification token | push_token | profiles.push_token | Upon logout / account deletion | Session end + account deletion |
| 7 | Notifications | type, title, body, data, user_id | notifications | 12 months | Inactivity timeout |
| 8 | Messages / conversations | messages, conversation_participants, message_hidden | messages | 30 days after last user message; legal hold possible | User request; legal hold possible |
| 9 | Bug reports (device context) | platform, os_version, app_version, device_model, locale, screen_resolution, timezone | bug_reports | 12 months | Inactivity timeout |
| 10 | Analytics events (post-consent) | `signup_step_completed` + metadata (sessionId override) | PostHog | Per PostHog retention policy (e.g. 12–24 months) | PostHog retention |
| 11 | Server logs & error reports | redacted error payloads, audit entries | Supabase / error tracker | 90 days (operational) | Log rotation / policy |
| 12 | External data (OSM clubs, OpenAgenda events) | external_clubs, events (is_external=true) | supabase | Until sync job stops (no user PII; coordinates may be personal) | Project decision |

---

## 2. Special data categories (higher obligation)

| Category | Fields | Applicable law |
|---|---|---|
| Biometric / health indications | `birthDate`, `heightCm`, `weightKg`, `timeSlots` (availability windows) | GDPR Art. 9 — *special category* risk; child data (birthDate → age < 16 → **heightened protection**) |
| Geolocation (indirect) | Nominatim coordinates (only for external clubs/events, not user data) | GDPR Art. 35 DPIA trigger if user location is stored |
| Communications content | messages | GDPR Art. 9 risk if private messages contain special categories; not special-categorised by default |

---

## 3. Implementation conditions

1. **Deletion triggers**: hard delete via `delete_my_account` (cascade) is the only deletion path; no soft-delete branch remains.
2. **Retention expiry**: an automated job (or manual review) must flag records past the retention period; deletion is immediate for credentials, ~30 days for messages (legal hold possible), 12 months for notifications/bug reports.
3. **Cross-border transfers**: PostHog events must be sent to an EU instance (EU/Europe) to stay within GDPR Chapter V.
4. **Right to erasure (GDPR Art. 17)**: the `delete_my_account` RPC satisfies it; the cascade deletion ensures no orphaned personal data remains.
5. **Data portability (GDPR Art. 20)**: `utils/conversationExport.ts` is the portable-format channel; the format and scope must be confirmed against legal review.

---

## 4. Review cadence

- Retention schedule reviewed **quarterly** by product + legal.
- Migration list re-verified before each major release via `scripts/check-function-drift.mjs`.
- This document is a living artifact: update the table when a data field is added/removed.
