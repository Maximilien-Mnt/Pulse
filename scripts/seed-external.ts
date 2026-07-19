/**
 * Seed script for external clubs and events data
 * Run with: npx tsx scripts/seed-external.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Sample clubs data for Luxembourg, France, Belgium
const externalClubs = [
  // Luxembourg
  {
    name: "Club Athlétique Luxembourg",
    sport: "athletics",
    address: "42 Avenue de la Gare",
    city: "Luxembourg",
    country: "Luxembourg",
    latitude: 49.6116,
    longitude: 6.1319,
    website: "https://cal.lu",
    source_url: "https://osm.org/club-cal-lux",
    source_name: "OpenStreetMap",
    is_external: true,
  },
  {
    name: "FC Déifferdeng 03",
    sport: "football",
    address: "1 Rue du Sports",
    city: "Differdange",
    country: "Luxembourg",
    latitude: 49.5247,
    longitude: 5.8913,
    website: "https://fc03.lu",
    source_url: "https://osm.org/club-fc03",
    source_name: "OpenStreetMap",
    is_external: true,
  },
  {
    name: "Swim Team Luxembourg",
    sport: "swimming",
    address: "25 Rue de la Natation",
    city: "Luxembourg",
    country: "Luxembourg",
    latitude: 49.6116,
    longitude: 6.1319,
    website: "https://swimteam.lu",
    source_url: "https://osm.org/club-swim-lux",
    source_name: "OpenStreetMap",
    is_external: true,
  },
  // France
  {
    name: "Paris Saint-Germain",
    sport: "football",
    address: "24 Rue de Proudhon",
    city: "Paris",
    country: "France",
    latitude: 48.8417,
    longitude: 2.2531,
    website: "https://psg.fr",
    source_url: "https://osm.org/club-psg",
    source_name: "OpenStreetMap",
    is_external: true,
  },
  {
    name: "Stade Rennais",
    sport: "football",
    address: "La Piverdière",
    city: "Rennes",
    country: "France",
    latitude: 48.1147,
    longitude: -1.6794,
    website: "https://staderennais.com",
    source_url: "https://osm.org/club-stade-rennais",
    source_name: "OpenStreetMap",
    is_external: true,
  },
  {
    name: "Olympique Lyonnais",
    sport: "football",
    address: "350 Avenue Jean Jaurès",
    city: "Lyon",
    country: "France",
    latitude: 45.7231,
    longitude: 4.8326,
    website: "https://ol.fr",
    source_url: "https://osm.org/club-ol",
    source_name: "OpenStreetMap",
    is_external: true,
  },
  // Belgium
  {
    name: "Club Brugge KV",
    sport: "football",
    address: "Kuipensestraat 72",
    city: "Brugge",
    country: "Belgium",
    latitude: 51.2095,
    longitude: 3.2247,
    website: "https://clubbrugge.be",
    source_url: "https://osm.org/club-clubbrugge",
    source_name: "OpenStreetMap",
    is_external: true,
  },
  {
    name: "Standard de Liège",
    sport: "football",
    address: "Rue de la Presse 12",
    city: "Liège",
    country: "Belgium",
    latitude: 50.6123,
    longitude: 5.5699,
    website: "https://standard.be",
    source_url: "https://osm.org/club-standard",
    source_name: "OpenStreetMap",
    is_external: true,
  },
  {
    name: "Royal Antwerp FC",
    sport: "football",
    address: "Antwerpsestraat 55",
    city: "Antwerpen",
    country: "Belgium",
    latitude: 51.2224,
    longitude: 4.3973,
    website: "https://rafc.be",
    source_url: "https://osm.org/club-antwerp",
    source_name: "OpenStreetMap",
    is_external: true,
  },
];

// Sample events
const externalEvents = [
  {
    title: "Marathon de Paris 2026",
    description: "Le plus célèbre marathon français",
    sport: "running",
    address: "Avenue des Champs-Élysées",
    city: "Paris",
    country: "France",
    latitude: 48.8698,
    longitude: 2.3078,
    start_date: "2026-04-05T08:00:00Z",
    end_date: "2026-04-05T16:00:00Z",
    website_url: "https://parismarathon.com",
    organizer_name: "ASO",
    source_url: "https://osm.org/event-parismarathon",
    source_name: "OpenStreetMap",
    is_external: true,
  },
  {
    title: "Tour de France 2026",
    description: "La plus grande course cycliste au monde",
    sport: "cycling",
    address: "Diverses étapes",
    city: "France",
    country: "France",
    latitude: 46.2276,
    longitude: 2.2137,
    start_date: "2026-07-02T09:00:00Z",
    end_date: "2026-07-24T18:00:00Z",
    website_url: "https://letour.fr",
    organizer_name: "ASO",
    source_url: "https://osm.org/event-tourdefrance",
    source_name: "OpenStreetMap",
    is_external: true,
  },
  {
    title: "Ironman Luxembourg",
    description: "Triathlon longue distance",
    sport: "triathlon",
    address: "Luxembourg City",
    city: "Luxembourg",
    country: "Luxembourg",
    latitude: 49.6116,
    longitude: 6.1319,
    start_date: "2026-09-20T06:00:00Z",
    end_date: "2026-09-20T22:00:00Z",
    website_url: "https://ironman.com/luxembourg",
    organizer_name: "Ironman Group",
    source_url: "https://osm.org/event-ironman-lux",
    source_name: "OpenStreetMap",
    is_external: true,
  },
  {
    title: "Brussels Marathon",
    description: "Marathon international à Bruxelles",
    sport: "running",
    address: "Place de la Concorde",
    city: "Bruxelles",
    country: "Belgium",
    latitude: 50.8503,
    longitude: 4.3517,
    start_date: "2026-10-04T08:30:00Z",
    end_date: "2026-10-04T16:00:00Z",
    website_url: "https://brusselsmarathon.be",
    organizer_name: "Running for Brussels",
    source_url: "https://osm.org/event-brusselsmarathon",
    source_name: "OpenStreetMap",
    is_external: true,
  },
];

async function seedExternalData() {
  console.log("🌱 Seeding external clubs...");
  
  const { error: clubsError } = await supabase
    .from("external_clubs")
    .upsert(externalClubs, { onConflict: "source_url" });
  
  if (clubsError) {
    console.error("Error seeding clubs:", clubsError);
  } else {
    console.log(`✅ Seeded ${externalClubs.length} external clubs`);
  }

  console.log("🌱 Seeding external events...");
  
  const { error: eventsError } = await supabase
    .from("external_events")
    .upsert(externalEvents, { onConflict: "source_url" });
  
  if (eventsError) {
    console.error("Error seeding events:", eventsError);
  } else {
    console.log(`✅ Seeded ${externalEvents.length} external events`);
  }

  console.log("✨ Seeding complete!");
}

seedExternalData().catch(console.error);
