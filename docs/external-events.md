# External sports-event ingestion (OpenAgenda)

## Decision

Pulse is a sports community app. The implementation imports **published, upcoming/current, sport-identifiable event listings** from a manually allowlisted set of public OpenAgenda agendas. It uses the official read API, not HTML scraping.

| Route | Reuse/access | Fit for Pulse | Decision |
|---|---|---|---|
| OpenAgenda official API | Read API requires an API key. OpenAgenda's [terms](https://doc.openagenda.com/conditions/) say public event announcements may be freely downloaded/reused under the applicable open licence and that publishers authorize third-party exploitation. Pulse still retains source attribution and a direct link. | Structured dates, location, public descriptions, keywords, age, registration links; agenda-by-agenda source control. The concrete [Luxembourg Sports Events agenda](https://openagenda.com/en/luxembourg-sports-events-agenda) describes itself as covering Luxembourg and the greater region, but its public page showed **no upcoming events on 2026-09-29**. | **Use the API**, but only after allowlisting reviewed agendas with actual upcoming Pulse-suitable sports events. The named agenda is a candidate, not an active populated feed today. |
| Luxembourg City event website | Its terms restrict automated extraction/republication without permission. | Rich local listings, but no clear permission for bulk copying. | **Do not scrape or import** without written permission. |
| OpenDataSoft/Huwise mirror of OpenAgenda events | The mirror's terms discourage/limit automated extraction; the queried Luxembourg dataset had no upcoming records at the review date. | API-shaped, but stale and not the primary source. | **Do not use**; call OpenAgenda directly. |
| Sports-club directories / current OSM sync | No sufficiently clear, suitable open-licensed Luxembourg club *organization* feed was identified in this review. The existing OSM path writes venues to `external_clubs`, while the app's club list reads `clubs`; sports facilities are not necessarily clubs. | Not a clean match for Pulse club entities; ODbL database obligations and attribution need separate handling. | **Not connected to the club UI**. Do not present generic facilities as clubs. |

### Legal and data-use boundary

This is an implementation choice, **not a legal opinion or a guarantee**. OpenAgenda's published API documentation describes published agenda data as openly reusable, but review each agenda's terms/licence and the record's publication status before adding its UID. Do not use private/unpublished records, bypass access controls, or scrape a website as a substitute for API permission. Preserve the source name and original event page, as the UI does; keep links to the original registration page. This importer does not download or republish event photos, and it does not copy organizer email addresses or phone numbers. If a publisher's licence or terms require different attribution or prohibit this display, remove that agenda from the allowlist and obtain permission.

## What the importer does

- Runs inside the existing Supabase Edge Function `sync-external-data`; it preserves the existing OpenStreetMap `external_clubs` sync.
- Reads only agenda UIDs in `OPENAGENDA_AGENDA_UIDS`, one agenda at a time, using the OpenAgenda API key in a server-side request header.
- Queries published current/upcoming events, uses the French language when available, handles API pagination (up to 3,000 results per agenda per run), and fails closed rather than hiding old rows if that ceiling is reached.
- Maps event name, sport classification, short/long description, conditions, dates, city/address/coordinates, keyword category, age range, any explicitly priced amount found in conditions, registration/access link, source name, and source URL to the existing Pulse `events` row model.
- Imports only events whose title/description/keywords identify one of Pulse's supported sports, whose physical venue is in Luxembourg, or which are online events published in an allowlisted Luxembourg agenda. This avoids misrepresenting concerts, exhibitions, or other non-sport listings as sports events.
- Uses a deterministic UUID from the globally unique OpenAgenda event UID, so repeated syncs update the same row. Events removed, cancelled, past, or no longer recognized as sports are **soft-hidden** (`is_private = true`) after a successful complete sync; rows and user history are not deleted.
- Sets `is_external`, `source_name = OpenAgenda`, and the source page. Registration opens the organizer's external registration link when supplied, then the online access link, then the original event page. It does not create an in-app join request.
- Shows an **External** badge, clickable source attribution, and “Check price on source” rather than claiming an unknown price is free.

No live rows have been imported from this sandbox because the repository does not contain an OpenAgenda API key or a reviewed agenda UID allowlist. In addition, the concrete Luxembourg Sports Events agenda displayed no upcoming listings on the review date; a currently populated sports agenda UID must be added before a nonzero event import can be expected. After setting those, invoke the function and inspect its JSON count/error response and the event feed.

## Enable it

1. Review the chosen public agendas and their reuse terms. Put only approved numeric agenda UIDs in a comma-separated list, e.g. `123456,789012`.
2. In Supabase Dashboard → **Edge Functions → Secrets**, set:
   - `OPENAGENDA_API_KEY`: the OpenAgenda read key (kept server-side; never put it in the app bundle).
   - `OPENAGENDA_AGENDA_UIDS`: the reviewed numeric agenda UIDs.
   - `EXTERNAL_SYNC_SECRET`: a freshly generated high-entropy secret (use the same value for the scheduled caller).
   Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the function runtime.
3. Deploy the repository's `sync-external-data` Edge Function and its `supabase/config.toml` setting. The function has platform JWT verification disabled so a database cron job can call it, but it rejects requests without the separate `x-sync-secret` header. **Never expose that secret to the mobile/web client.**
4. Smoke-test from a trusted terminal, replacing the placeholders without committing them:

   ```sh
   curl --fail-with-body -X POST "$SUPABASE_URL/functions/v1/sync-external-data" \
     -H 'Content-Type: application/json' \
     -H "x-sync-secret: $EXTERNAL_SYNC_SECRET" \
     -d '{}'
   ```

   Confirm `success: true`, `events_synced` is plausible, and the rows appear with source attribution and the expected event links. A missing key/agenda list returns an explicit configuration error; an OpenAgenda failure does not perform stale-row cleanup.

5. For daily refresh, enable `pg_cron`, `pg_net`, and Vault in Supabase. Put the project URL and **the same** `EXTERNAL_SYNC_SECRET` in Vault under the names below (Supabase recommends Vault for scheduled-call secrets), then schedule daily at 03:00 UTC:

   ```sql
   select vault.create_secret('https://<project-ref>.supabase.co', 'pulse_project_url');
   select vault.create_secret('<same-high-entropy-secret-as-EXTERNAL_SYNC_SECRET>', 'pulse_external_sync_secret');

   select cron.schedule(
     'pulse-openagenda-daily-sync',
     '0 3 * * *',
     $$
       select net.http_post(
         url := (select decrypted_secret from vault.decrypted_secrets where name = 'pulse_project_url')
                || '/functions/v1/sync-external-data',
         headers := jsonb_build_object(
           'Content-Type', 'application/json',
           'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'pulse_external_sync_secret')
         ),
         body := '{}'::jsonb
       ) as request_id;
     $$
   );
   ```

   Use Supabase Vault or another approved secret store; do not place the secret in a committed SQL migration or schedule definition as plaintext. Check Edge Function logs and the cron invocation status after the first run. Supabase's current [scheduled Edge Function guide](https://supabase.com/docs/guides/functions/schedule-functions) uses `pg_cron` + `pg_net` and recommends Vault.

## Source references

- [OpenAgenda API documentation](https://developers.openagenda.com/en/) — [authentication](https://developers.openagenda.com/en/authentification/), [event reading and pagination](https://developers.openagenda.com/en/evenements/lecture/), [event structure](https://developers.openagenda.com/en/evenements/structure/), [agenda search](https://developers.openagenda.com/en/agendas/recherche/).
- [OpenAgenda terms of use](https://doc.openagenda.com/conditions/) — the “Propriété intellectuelle sur les contenus publiés par l'utilisateur” section covers reuse of public event announcements under the applicable open licence. This implementation does not mirror images and preserves text-source links.
- [Luxembourg Sports Events, Agenda](https://openagenda.com/en/luxembourg-sports-events-agenda) — public listing describes a Luxembourg-and-greater-region sports calendar; it showed no upcoming events at the time reviewed.
- [Luxembourg City terms of use](https://www.luxembourg-city.com/en/terms-of-use).
- [OpenDataSoft/Huwise terms](https://public.opendatasoft.com/terms/terms-and-conditions/) and the [Luxembourg events mirror](https://public.opendatasoft.com/explore/dataset/evenements-publics-openagenda/).
- [OpenStreetMap copyright and licence](https://www.openstreetmap.org/copyright) — OSM data is ODbL, with attribution and share-alike obligations for qualifying database use.
- [Luxembourg Open Data reuse guide](https://data.public.lu/en/pages/guides-of-reuse/).
- The OpenAgenda API docs say `size` is capped at 300 and support `from`/`after` pagination; this importer caps an agenda at 3,000 records per sync for bounded runtime.

## Verification

`__tests__/openAgenda.test.ts` covers normalization, language maps, safe source/registration links, Luxembourg/sport/cancellation filtering, date/price mapping, online listings, and stable event IDs. The relevant unit tests and TypeScript checks are listed in the task completion report.
