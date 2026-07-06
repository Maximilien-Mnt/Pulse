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

function esc(s) {
  return String(s).replace(/'/g, "''");
}

let sql = "-- Seed Pulse (clubs + événements)\nSET search_path = public;\n";

for (let i = 0; i < 52; i++) {
  const sp = sports[i % 12];
  const [ci, co] = cities[i % cities.length];
  const ext = i % 5 !== 0;
  const name = esc(`${ci} ${sp} ${i + 1}`);
  const logo = `https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&sig=${i}`;
  const extPart = ext ? `true, 'https://source.example/${i + 1}', 'Fédération'` : `false, NULL, NULL`;
  sql += `INSERT INTO clubs (name,sport,description,short_description,country,city,logo_url,registration_url,is_external,source_url,source_name,member_count) VALUES ('${name}','${sp}','Club communautaire autour du ${sp}.','Rejoignez-nous.','${co}','${esc(
    ci
  )}','${logo}','https://www.federation-sport.lu/inscription/${i + 1}', ${extPart}, ${20 + (i % 50)});\n`;
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
  const nm = esc(`Tournoi ${sp} ${ci} ${j + 1}`);
  sql += `INSERT INTO events (name,sport,description,short_description,country,city,start_date,end_date,price_cents,is_paid,difficulty,category,logo_url,registration_url,is_external,places_total,places_left) VALUES ('${nm}','${sp}','Événement sportif.','Inscription ouverte.','${co}','${esc(
    ci
  )}','${iso}',NULL,${price},${paid}, ${1 + (j % 5)}, 'Tournoi','https://images.unsplash.com/photo-1517649763962-0c62306601b7?w=400&sig=${j}','https://www.federation-sport.lu/event/${
    j + 1
  }',${j % 6 === 0 ? "true" : "false"}, ${50 + (j % 100)}, ${40 + (j % 80)});\n`;
}

const out = path.join(__dirname, "..", "supabase", "seed", "seed.sql");
fs.writeFileSync(out, sql);
console.log("Wrote", out, sql.length);
