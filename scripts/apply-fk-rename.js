const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://eqrhjmuaaaarjxuprjaj.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function execSql(sql) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ sql }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  console.log('Inspecting current FK constraints...');
  const inspect = await execSql(`
    SELECT conname, conrelid::regclass AS table_name
    FROM pg_constraint
    WHERE conrelid IN ('public.clubs'::regclass, 'public.events'::regclass)
      AND confrelid = 'public.profiles'::regclass;
  `);
  console.log('Current FK constraints:', JSON.stringify(inspect, null, 2));

  const oldClub = inspect.find((r) => r.table_name === 'clubs')?.conname || 'fk_clubs_created_by';
  const oldEvent = inspect.find((r) => r.table_name === 'events')?.conname || 'fk_events_created_by';

  console.log(`Dropping old constraints: ${oldClub}, ${oldEvent}`);

  await execSql(`ALTER TABLE public.clubs DROP CONSTRAINT IF EXISTS "${oldClub}";`);
  await execSql(`ALTER TABLE public.events DROP CONSTRAINT IF EXISTS "${oldEvent}";`);

  console.log('Creating new named constraints...');
  await execSql(`
    ALTER TABLE public.clubs
      ADD CONSTRAINT fk_clubs_created_by
      FOREIGN KEY (created_by) REFERENCES public.profiles(id);
  `);
  await execSql(`
    ALTER TABLE public.events
      ADD CONSTRAINT fk_events_created_by
      FOREIGN KEY (created_by) REFERENCES public.profiles(id);
  `);

  console.log('Verifying...');
  const verify = await execSql(`
    SELECT conname, conrelid::regclass AS table_name
    FROM pg_constraint
    WHERE conrelid IN ('public.clubs'::regclass, 'public.events'::regclass)
      AND confrelid = 'public.profiles'::regclass;
  `);
  console.log('New FK constraints:', JSON.stringify(verify, null, 2));

  const clubOk = verify.some((r) => r.table_name === 'clubs' && r.conname === 'fk_clubs_created_by');
  const eventOk = verify.some((r) => r.table_name === 'events' && r.conname === 'fk_events_created_by');

  if (clubOk && eventOk) {
    console.log('Done. Constraints renamed successfully.');
    process.exit(0);
  } else {
    console.error('Verification failed.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});