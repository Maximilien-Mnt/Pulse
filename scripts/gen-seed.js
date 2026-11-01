const fs = require("fs");
const path = require("path");

const sports = [
  "football",
  "basketball",
  "tennis",
  "running",
  "cycling",
  "swimming",
  "volleyball",
  "handball",
  "padel",
  "badminton",
  "fitness",
  "rugby",
];

const cities = [
  ["Luxembourg", "LU"],
  ["Strassen", "LU"],
  ["Esch-sur-Alzette", "LU"],
  ["Paris", "FR"],
  ["Lyon", "FR"],
  ["Metz", "FR"],
  ["Bruxelles", "BE"],
  ["Liege", "BE"],
  ["Arlon", "BE"],
  ["Namur", "BE"],
];

// PostgreSQL runs with standard_conforming_strings = ON by default (since 9.1),
// so inside a '...' string literal only a single quote needs escaping
// (doubled: ' -> ''). Backslashes are treated literally.
// Every interpolated value passes through sqlLiteral, so no raw value ever
// reaches the SQL text — this is the seed-script equivalent of parameterized queries.
function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  return "'" + String(value).replace(/'/g, "''") + "'";
}

let sql = "-- Seed Pulse (clubs + événements)\nSET search_path = public;\n";

for (let i = 0; i < 52; i++) {
  const sp = sports[i % 12];
  const [ci, co] = cities[i % cities.length];
  const ext = i % 5 !== 0;
  const name = sqlLiteral(`${ci} ${sp} ${i + 1}`);
  const logo = `https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&sig=${i}`;
  const isExternal = ext ? "true" : "false";
  const sourceUrl = ext ? sqlLiteral(`https://source.example/${i + 1}`) : "NULL";
  const sourceName = ext ? sqlLiteral("Fédération") : "NULL";
  const memberCount = 20 + (i % 50);
  sql += `INSERT INTO clubs (name,sport,description,short_description,country,city,logo_url,registration_url,is_external,source_url,source_name,member_count) VALUES (${name},${sqlLiteral(sp)},${sqlLiteral(`Club communautaire autour du ${sp}.`)},${sqlLiteral("Rejoignez-nous.")},${sqlLiteral(co)},${sqlLiteral(ci)},${sqlLiteral(logo)},${sqlLiteral(`https://www.federation-sport.lu/inscription/${i + 1}`)}, ${isExternal}, ${sourceUrl}, ${sourceName}, ${memberCount});\n`;
}

const start = new Date("2026-06-01T10:00:00Z");
for (let j = 0; j < 32; j++) {
  const sp = sports[j % 12];
  const [ci, co] = cities[(j + 3) % cities.length];
  const paid = j % 4 === 0;
  const price = paid ? 1500 + j * 100 : 0;
  const d = new Date(start);
  d.setDate(d.getDate() + 7 * j);
  const iso = d.toISOString();
  const nm = sqlLiteral(`Tournoi ${sp} ${ci} ${j + 1}`);
  const isPaid = paid ? "true" : "false";
  const isExternalEvent = j % 6 === 0 ? "true" : "false";
  const placesTotal = 50 + (j % 100);
  const placesLeft = 40 + (j % 80);
  sql += `INSERT INTO events (name,sport,description,short_description,country,city,start_date,end_date,price_cents,is_paid,difficulty,category,logo_url,registration_url,is_external,places_total,places_left) VALUES (${nm},${sqlLiteral(sp)},${sqlLiteral("Événement sportif.")},${sqlLiteral("Inscription ouverte.")},${sqlLiteral(co)},${sqlLiteral(ci)},${sqlLiteral(iso)},NULL,${price},${isPaid}, ${1 + (j % 5)},${sqlLiteral("Tournoi")},${sqlLiteral(`https://images.unsplash.com/photo-1517649763962-0c62306601b7?w=400&sig=${j}`)},${sqlLiteral(`https://www.federation-sport.lu/event/${j + 1}`)},${isExternalEvent}, ${placesTotal}, ${placesLeft});\n`;
}

const out = path.join(__dirname, "..", "supabase", "seed", "seed.sql");
fs.writeFileSync(out, sql);
console.log("Wrote", out, sql.length);
