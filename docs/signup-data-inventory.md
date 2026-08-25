# 📋 Data Collected During Signup — Inventory & Purposes

> Auto-generated from a full audit of the Pulse signup flow (steps 1–5).  
> This document lists **every piece of data** collected from a new user at account creation, whether **required** or **optional**, and the **reason** each item is collected.

---

## Step 1 — Account Creation & Credentials

| Data Field | Type | Required? | Reason for Collection |
|---|---|---|---|
| `language` | string | ✅ | Personalize the UI language and enable future multi-language support |
| `fullName` | string | ✅ | Identify the user; display their name on their profile, in clubs, and on social interactions |
| `username` | string | ✅ | Unique public handle / slug for the user's profile; must be unique across the app |
| `email` | string | ✅ | Authenticate the account, send the email-verification link, unlock the account after confirmation, and send security/operational emails |
| `password` | string | ✅ | Authenticate the user on every login (stored encrypted locally on the device via `expo-crypto` + `expo-secure-store`; never saved to the server in plaintext) |
| `confirmPassword` | string | ✅ | Validation only — confirms the password was typed correctly; **not persisted** |

---

## Step 2 — Demographic & Location

| Data Field | Type | Required? | Reason for Collection |
|---|---|---|---|
| `birthDate` | date | ✅ | Verify the user meets the minimum age requirement (**16 years**); used for age-appropriate matching in clubs/events that may have age restrictions |
| `country` | string (ISO code) | ✅ | Personalize event/club suggestions by geographic proximity; comply with applicable jurisdiction (data controller is based in Luxembourg → GDPR applies by default) |
| `city` | string | ❌ | Refine event/club suggestions to the user's area; optional to reduce friction if the user prefers not to share |

---

## Step 3 — Sports & Availability

| Data Field | Type | Required? | Reason for Collection |
|---|---|---|---|
| `sportId` | string (SportId) | ✅ | Match the user with relevant clubs, events, and content; show appropriate sports in their feed |
| `level` | string | ✅ | Present clubs/events suited to the user's skill level (beginner, intermediate, advanced, etc.) |
| `practice` | string | ✅ | Distinguish recreational vs competitive users to personalize club/event recommendations |
| `timeSlots` | array of `{ weekday, startHour, endHour }` | ✅ | New JSONB representation for multiple availability windows per day per sport |


> **Previously collected:** `timesPerWeek` (a frequency number). This was **removed** in favor of explicit time-window availability (`startHour`/`endHour`) + weekday selection, which is more useful for scheduling matching.
> 
> **Updated in step 3 (time slots):** The old flat `weekdays[]` + `startHour` + `endHour` schema has been replaced by an array of time slots (`timeSlots`), where each slot carries its own `weekday`, `startHour`, and `endHour`. This allows users to specify multiple windows (e.g., Monday 08:00-20:00 **and** Tuesday 18:00-23:00).

---

## Step 4 — Interests & Body Metrics

| Data Field | Type | Required? | Reason for Collection |
|---|---|---|---|
| `interestedSports[]` | string[] | ✅ | Broad interests beyond practiced sports for feed personalization and recommendations |
| `objectives[]` | string[] | ✅ | Understand user goals (e.g. fitness, competition, social) to tailor content and event suggestions |
| `heightCm` | string (number) | ❌ | Optional health/fitness context for personalized recommendations |
| `weightKg` | string (number) | ❌ | Optional health/fitness context for personalized recommendations |

---

## Step 5 — Profile & Legal

| Data Field | Type | Required? | Reason for Collection |
|---|---|---|---|
| `bio` | string (max 300 chars) | ❌ | Let the user introduce themselves; displayed on their public profile |
| `discovery` | string | ❌ | Understand which channel brought the user to Pulse (marketing attribution, product improvement). One of: IA/assistant de conversation, publicité/annonce, navigateur web/moteur de recherche, réseaux sociaux, ami/recommandation, application similaire, ou "Autre" |
| `discoveryDetails` | string (max 500 chars) | ❌ | Free-text details provided when the user selects "Autre" as their discovery source, so we can capture the specifics they provide |
| `acceptTerms` | boolean | ✅ | Legal compliance — user must agree to the Terms of Service to use the app |
| `acceptPrivacy` | boolean | ✅ | Legal compliance — user must acknowledge the Privacy Policy to use the app |

---

## Post-Signup / Implicit Data

| Data Field | When? | Required? | Reason for Collection |
|---|---|---|---|
| `pushToken` | After email confirmation (if user grants permission) | ❌ | Deliver push notifications (messages, event reminders, club invitations) |
| `location` (lat/lon) | Only when the user grants permission | ❌ | Geolocation-based features (nearby clubs/events, maps) — only collected with explicit consent |
| `avatar_url` | After signup, when the user uploads a profile photo | ❌ | Display the user's photo on their profile and social interactions |

---

## Summary Table

**Required fields (must be provided for account creation):**

1. Language
2. Full name
3. Username
4. Email address
5. Password
6. Birth date *(≥ 16 years)*
7. Country
8. Sport(s) practiced
9. Practice level(s)
10. Practice type (récréatif / compétitif)
11. Available weekday(s)
12. Start hour of availability
13. End hour of availability
14. Interested sports (step 4)
15. Objectives
16. Terms acceptance
17. Privacy policy acceptance

**Optional fields (can be skipped):**

- City
- Height
- Weight
- Bio
- Discovery source
- Discovery details (Other)
- Push notifications permission
- Location permission
- Profile photo upload
