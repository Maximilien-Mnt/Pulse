## HTTPS Enforcement Changes Summary

### Changes Made (Act Mode):

1. **`lib/constants.ts` (line 23)**:
   - Changed: `return \`http://localhost:8081${path}\`` → `return \`https://localhost:8081${path}\``
   - This forces HTTPS for the web redirect URL fallback in the `getRedirectUrl()` function used by Supabase Auth for password recovery.

2. **`__tests__/forgot-password.test.tsx` (line 40)**:
   - Changed: `getRedirectUrl: () => "http://localhost:8081/auth/reset-password"` → `getRedirectUrl: () => "https://localhost:8081/auth/reset-password"`
   - Updated the test mock to match the new HTTPS URL.

3. **`__tests__/forgot-password.test.tsx` (line 73)**:
   - Changed: `redirectTo: "http://localhost:8081/auth/reset-password"` → `redirectTo: "https://localhost:8081/auth/reset-password"`
   - Updated the test expectation to match the new HTTPS URL.

### Verification:

- ✅ `lib/constants.ts` line 23 now shows `https://localhost:8081`
- ✅ Test mock (line 40) now uses `https://localhost:8081/auth/reset-password`
- ✅ Test expectation (line 73) now uses `https://localhost:8081/auth/reset-password`

### Impact:

- Password recovery links on the web will now use HTTPS instead of HTTP
- Consistent with the existing production configuration which already uses `POSTHOG_HOST=https://eu.i.posthog.com`
- No other HTTP references in the source code needed updating (verified via search)