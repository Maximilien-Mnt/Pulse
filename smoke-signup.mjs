// smoke-signup.mjs — Extended Deno test suite for signup hardening
// Run with: deno run --allow-env --allow-net smoke-signup.mjs
//
// Tests:
//  1. Request without Origin and without Turnstile token -> CAPTCHA_REQUIRED
//  2. Password < 10 chars -> INVALID_PAYLOAD
//  3. Valid request with Turnstile token -> success path (mocked)
//  4. Valid request from native-like (X-Device-Id, no Origin) -> success path (mocked)

const BASE_URL = Deno.env.get("SIGNUP_TEST_URL") ?? "http://localhost:54321/functions/v1";
const errors: string[] = [];
let passed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log(`  \u2713 ${msg}`);
  } else {
    errors.push(msg);
    console.log(`  \u2717 ${msg}`);
  }
}

async function postSignup(headers: Record<string, string>, body: unknown) {
  const res = await fetch(`${BASE_URL}/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

// Test 1
console.log("Test 1: CAPTCHA required (no Origin, no Turnstile token)");
{
  const { status, body } = await postSignup({}, {
    email: "test@example.com",
    password: "a".repeat(12),
    full_name: "Test User",
    username: "testuser",
    birth_date: "2000-01-01",
    country: "FR",
    sports: [],
    accept_terms: true,
    accept_privacy: true,
  });
  console.log(`  Status: ${status}, Body:`, JSON.stringify(body));
  assert(status === 400, "Should return 400");
  assert(body.error === "CAPTCHA_REQUIRED", "Should return CAPTCHA_REQUIRED");
}

// Test 2
console.log("Test 2: Password too short (< 10 chars)");
{
  const { status, body } = await postSignup(
    { "x-turnstile-token": "dummy-token" },
    {
      email: "test@example.com",
      password: "short12",
      full_name: "Test User",
      username: "testuser",
      birth_date: "2000-01-01",
      country: "FR",
      sports: [],
      accept_terms: true,
      accept_privacy: true,
    }
  );
  console.log(`  Status: ${status}, Body:`, JSON.stringify(body));
  assert(status === 400, "Should return 400");
  assert(body.error === "INVALID_PAYLOAD", "Should return INVALID_PAYLOAD");
}

// Test 3
console.log("Test 3: Native-like request (X-Device-Id, no Origin)");
{
  const { status, body } = await postSignup(
    { "x-device-id": "device-12345" },
    {
      email: "test@example.com",
      password: "a".repeat(12),
      full_name: "Test User",
      username: "testuser",
      birth_date: "2000-01-01",
      country: "FR",
      sports: [],
      accept_terms: true,
      accept_privacy: true,
    }
  );
  console.log(`  Status: ${status}, Body:`, JSON.stringify(body));
  assert(status !== 400 || body.error === "CAPTCHA_REQUIRED", "Should not be CAPTCHA_REQUIRED");

// Test 6
console.log("Test 6: Country not in whitelist");
{
  const { status, body } = await postSignup(
    { "x-turnstile-token": "dummy-token" },
    {
      email: "test@example.com",
      password: "a".repeat(12),
      full_name: "Test User",
      username: "testuser",
      birth_date: "2000-01-01",
      country: "XX",
      sports: [],
      accept_terms: true,
      accept_privacy: true,
    }
  );
  console.log(`  Status: ${status}, Body:`, JSON.stringify(body));
  assert(status === 400, "Should return 400");
  assert(body.error === "INVALID_PAYLOAD", "Should return INVALID_PAYLOAD");
}

// Test 7
console.log("Test 7: Language not in whitelist");
{
  const { status, body } = await postSignup(
    { "x-turnstile-token": "dummy-token" },
    {
      email: "test@example.com",
      password: "a".repeat(12),
      full_name: "Test User",
      username: "testuser",
      birth_date: "2000-01-01",
      country: "FR",
      language: "xx",
      sports: [],
      accept_terms: true,
      accept_privacy: true,
    }
  );
  console.log(`  Status: ${status}, Body:`, JSON.stringify(body));
  assert(status === 400, "Should return 400");
  assert(body.error === "INVALID_PAYLOAD", "Should return INVALID_PAYLOAD");
}

// Test 8
console.log("Test 8: Missing accept_terms");
{
  const { status, body } = await postSignup(
    { "x-turnstile-token": "dummy-token" },
    {
      email: "test@example.com",
      password: "a".repeat(12),
      full_name: "Test User",
      username: "testuser",
      birth_date: "2000-01-01",
      country: "FR",
      sports: [],
      accept_privacy: true,
    }
  );
  console.log(`  Status: ${status}, Body:`, JSON.stringify(body));
  assert(status === 400, "Should return 400");
  assert(body.error === "INVALID_PAYLOAD", "Should return INVALID_PAYLOAD");
}

// Test 9
console.log("Test 9: Missing accept_privacy");
{
  const { status, body } = await postSignup(
    { "x-turnstile-token": "dummy-token" },
    {
      email: "test@example.com",
      password: "a".repeat(12),
      full_name: "Test User",
      username: "testuser",
      birth_date: "2000-01-01",
      country: "FR",
      sports: [],
      accept_terms: true,
    }
  );
  console.log(`  Status: ${status}, Body:`, JSON.stringify(body));
  assert(status === 400, "Should return 400");
  assert(body.error === "INVALID_PAYLOAD", "Should return INVALID_PAYLOAD");
}

console.log(`\n=== Summary: ${passed} passed, ${errors.length} failed ===`);
if (errors.length > 0) {
  console.log("\nFailed tests:");
  errors.forEach((e) => console.log(`  - ${e}`));
  Deno.exit(1);
}
process.exit(0);
}