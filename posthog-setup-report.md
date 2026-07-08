<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Pulse sports social app. The SDK (`posthog-react-native`) and all required peer dependencies were installed. A `src/config/posthog.ts` singleton was created, credentials are loaded via `expo-constants` from `app.config.js` extras (never hardcoded). `PostHogProvider` and manual screen tracking were wired into `app/_layout.tsx`. User identification is called on session restore (`hooks/useAuth.ts`) and on every login/signup. Twelve events covering the full user lifecycle — signup funnel, authentication, social engagement, and churn — were instrumented across 10 files.

| Event | Description | File |
|---|---|---|
| `user_signed_in` | Fired when a user successfully signs in with email and password. | `app/auth/signin.tsx` |
| `user_signed_up` | Fired when a user completes the full 5-step registration and account is created in Supabase. | `app/auth/signup/step5.tsx` |
| `signup_step_completed` (step 1) | Fired each time a user advances from step 1 (basic info, language, username). | `app/auth/signup/step1.tsx` |
| `signup_step_completed` (step 2) | Fired each time a user advances from step 2 (birth date, country, city). | `app/auth/signup/step2.tsx` |
| `signup_step_completed` (step 3) | Fired each time a user advances from step 3 (sports selection). | `app/auth/signup/step3.tsx` |
| `signup_step_completed` (step 4) | Fired each time a user advances from step 4 (fitness goals and objectives). | `app/auth/signup/step4.tsx` |
| `post_published` | Fired when a user successfully publishes a post to the feed. | `app/(tabs)/create/index.tsx` |
| `conversation_started` | Fired when a user initiates a new conversation with another user. | `app/(tabs)/create/index.tsx` |
| `club_join_requested` | Fired when a user submits a request to join a sports club. | `app/(tabs)/clubs/[clubId].tsx` |
| `event_join_requested` | Fired when a user submits a request to participate in a sports event. | `app/(tabs)/events/[eventId].tsx` |
| `profile_updated` | Fired when a user saves changes to their profile (name, bio, city). | `app/(tabs)/profile/index.tsx` |
| `user_signed_out` | Fired when a user signs out of the app. | `app/(tabs)/profile/index.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://eu.posthog.com/project/218179/dashboard/800347)
- [Signup conversion funnel](https://eu.posthog.com/project/218179/insights/RQBQPcMO)
- [New signups over time](https://eu.posthog.com/project/218179/insights/CYAH80CF)
- [Engagement actions over time](https://eu.posthog.com/project/218179/insights/HW1utuN4)
- [Sign-ins vs sign-outs](https://eu.posthog.com/project/218179/insights/7Vwxa1ZP)
- [Sign-in to first engagement funnel](https://eu.posthog.com/project/218179/insights/pHYzWgtG)

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` to `.env.example` and any onboarding scripts so collaborators know what to set.
- [ ] Confirm the returning-visitor path also calls `identify` — currently handled in `hooks/useAuth.ts` on `onAuthStateChange`, but verify it fires correctly for persisted Supabase sessions on app restart.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
