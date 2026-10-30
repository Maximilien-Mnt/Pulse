# Deployment Guide — Phase 2 Hardening

## 1. Migration

```bash
supabase db push --project-ref <your-project-id>
```

Migration applied: `062_rate_limits_and_consents.sql` creates:
- `public.rate_limits` table (persistent rate counters)
- `public.user_consents` table (consent proofs)
- `public.check_rate_limit()` RPC (service_role only)

## 2. Environment Variables

Define the following in Supabase Dashboard → Project Settings → Environment Variables (or `supabase .env`:

### Signup
| Variable | Default | Description |
|----------|---------|-------------|
| `SIGNUP_RATE_LIMIT_PER_IP` | `5` | Max signups per IP per window |
| `SIGNUP_RATE_LIMIT_PER_DEVICE` | `3` | Max signups per device per window |
| `SIGNUP_RATE_LIMIT_WINDOW_SECS` | `3600` | Rate limit window (1h) |
| `TURNSTILE_SECRET_KEY` | - | Cloudflare Turnstile secret key |
| `STORAGE_PUBLIC_DOMAIN` | - | Your public storage domain (e.g. `eqrhjmuaaaarjxuprjaj.supabase.co`) |
| `ALLOWED_COUNTRIES` | `FR,BE,LU,CH,ES,DE,GB,IT,NL,AT,PT,SE,NO,DK,FI,PL,CZ,SK,HU,RO,BG,HR,SI,EE,LV,LT` | Whitelist for signup country |
| `ALLOWED_LANGUAGES` | `fr,en,de,it,es,nl,pt,pl,cs,sk,hu,ro,bg,hr,sr,sl,et,lv,lt,da,no,sv,fi` | Whitelist for signup language |
| `TERMS_VERSION` | `1.0` | Version of terms of service |
| `PRIVACY_VERSION` | `1.0` | Version of privacy policy |

### Send Notification
| Variable | Default | Description |
|----------|---------|-------------|
| `NOTIFY_RATE_LIMIT_PER_CALLER` | `20` | Max notifications per caller per hour |
| `NOTIFY_RATE_LIMIT_WINDOW_SECS` | `3600` | Rate limit window |

### Geocode
| Variable | Default | Description |
|----------|---------|-------------|
| `GEOCODE_RATE_LIMIT_PER_USER` | `60` | Max geocode calls per user per hour |
| `GEOCODE_RATE_LIMIT_WINDOW_SECS` | `3600` | Rate limit window |

### Sync External Data
| Variable | Default | Description |
|----------|---------|-------------|
| `EXTERNAL_SYNC_SECRET` | - | Shared secret for cron access |
| `OPENAGENDA_API_KEY` | - | OpenAgenda API key |
| `OPENAGENDA_AGENDA_UIDS` | - | Comma-separated agenda IDs |

### Cors (Shared)
| Variable | Default | Description |
|----------|---------|-------------|
| `ALLOWED_ORIGINS` | - | Comma-separated list of allowed origin domains |

## 3. Edge Function Deployments

```bash
# Deploy all functions
supabase functions deploy signup --no-verify-jwt
supabase functions deploy send-notification
supabase functions deploy geocode
supabase functions deploy sync-external-data
supabase functions deploy update-user-stats

# Or deploy individually
supabase functions deploy <function-name>
```

**Verify JWT settings** (from `supabase/config.toml`):
- `signup`: `verify_jwt = false` (users sign up before having a JWT)
- `geocode`: `verify_jwt = true`
- `send-notification`: `verify_jwt = true`
- `sync-external-data`: `verify_jwt = false` (internal cron)
- `update-user-stats`: `verify_jwt = true`

## 4. Database Migration Order

```bash
# 1. Apply rate limiting + consents migration
supabase db push --project-ref <your-project-id>

# 2. Wait for migration to complete
supabase status

# 3. Verify the new tables exist
supabase functions pull

# 4. Check migration status
supabase migration list
```

## 5. Verification Checklist

- [ ] Migration applied: `public.rate_limits`, `public.user_consents`, `check_rate_limit` RPC
- [ ] Env vars configured in Supabase dashboard
- [ ] All 5 functions deployed
- [ ] `TURNSTILE_SECRET_KEY` set (optional: skip CAPTCHA for native)
- [ ] `STORAGE_PUBLIC_DOMAIN` set to your storage domain
- [ ] `ALLOWED_ORIGINS` set with your domains (no defaults)
- [ ] `EXTERNAL_SYNC_SECRET` set for sync-external-data
- [ ] `OPENAGENDA_API_KEY` and `OPENAGENDA_AGENDA_UIDS` set (optional: skip OpenAgenda import)
- [ ] `STATS_JOB_SECRET` configured for update-user-stats

## 6. Testing

```bash
# Run Deno smoke tests (requires Deno 1.x)
deno run --allow-env --allow-net smoke-signup.mjs

# Type check
deno check supabase/functions/signup/index.ts
deno check supabase/functions/send-notification/index.ts
deno check supabase/functions/geocode/index.ts
deno check supabase/functions/sync-external-data/index.ts
deno check supabase/functions/update-user-stats/index.ts

# Lint (if deno fmt configured)
deno fmt --check supabase/functions/**

# Full test suite
npm test
```

## 7. Rollback

```bash
# Revert the migration (idempotent, safe to re-run)
supabase db push --project-ref <your-project-id> --dry-run

# Rollback migration if needed (not recommended - destructive)
# Edit 062_*.sql to add a reverse migration
```

## 8. Known Platform: Win32

Commands above use `supabase` CLI. On Windows, run in elevated PowerShell:
```powershell
supabase functions deploy signup --no-verify-jwt
supabase db push --project-ref eqrhjmuaaaarjxuprjaj
```

For CI/CD, use GitHub Actions `supabase Actions`:
```yaml
- name: Push migrations
  run: supabase db push --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
    SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
```