// Seeds the prototype's sample data (src/data.ts). Idempotent: rows use fixed ids and skip on conflict.
// Run: pnpm db:seed (reads DATABASE_URL from .env.local)
import { config } from "dotenv";
config({ path: ".env.local" });

const arrivalTasks = [
  {
    id: 1,
    section: 0,
    title: "Prepare your travel & student documents",
    detail:
      "Keep your passport, UTM offer letter, visa or entry authorisation, and accommodation confirmation in your hand luggage. Save a copy offline and leave a copy with someone you trust.",
    documents: "Passport · Offer letter · Entry authorisation · Accommodation address",
    link: "Passport & Immigration Office",
    url: "https://passport.govmu.org/",
  },
  {
    id: 2,
    section: 0,
    title: "Arrange airport pickup & your first night",
    detail:
      "Confirm your transfer from Sir Seewoosagur Ramgoolam International Airport to Pointe-aux-Sables or La Tour Koenig before you fly. Share your flight number and arrival time with your host. Use the airport’s authorised taxi desk if your pickup changes.",
    documents: "Flight details · Host contact · Temporary accommodation booking",
    link: "Mauritius Airport information",
    url: "https://mauritius-airport.atol.aero/",
  },
  {
    id: 3,
    section: 1,
    title: "Let someone know you arrived safely",
    detail:
      "Check in with your family and your accommodation host. Confirm your address and save local emergency contacts. In an immediate emergency, contact the police on 999.",
    documents: "Your local address · Emergency contact",
    link: "UTM official website",
    url: "https://www.utm.ac.mu/",
  },
  {
    id: 4,
    section: 1,
    title: "Get a local SIM card",
    detail:
      "Visit a My.T or Emtel shop at Bagatelle or in Port Louis. Ask for a prepaid SIM and compare data bundles before paying. The shop will need to register your SIM using your passport.",
    documents: "Original passport · Local accommodation address",
    link: "My.T mobile services",
    url: "https://www.myt.mu/",
  },
  {
    id: 5,
    section: 2,
    title: "Open a student bank account",
    detail:
      "Contact an MCB or SBM branch to confirm current student account requirements and book an appointment. Bring originals and copies. A proof-of-address letter from your landlord may need supporting documents; ask the bank first.",
    documents: "Passport · UTM enrolment letter · Proof of address · Residence permit, if issued",
    link: "MCB personal banking",
    url: "https://mcb.mu/",
  },
  {
    id: 6,
    section: 2,
    title: "Plan your bus route & apply for a MECard",
    detail:
      "Check bus services between Rose Hill, Port Louis and La Tour Koenig. Visit a Metro Express station to ask about the MECard and current student eligibility. Metro Express does not stop directly at UTM, so plan your onward bus connection.",
    documents: "Passport · Student enrolment confirmation · Passport-size photo, if requested",
    link: "Metro Express travel information",
    url: "https://mauritiusmetroexpress.mu/",
  },
  {
    id: 7,
    section: 3,
    title: "Collect your UTM Student ID & check in",
    detail:
      "Visit Student Affairs on the La Tour Koenig campus. Confirm your registration, collect your Student ID and ask staff to check your passport and residence permit documentation. Confirm any immigration deadlines directly with authorised staff.",
    documents: "Passport · Residence permit or application receipt · UTM offer/enrolment letter",
    link: "UTM Student Affairs",
    url: "https://www.utm.ac.mu/",
  },
  {
    id: 8,
    section: 3,
    title: "Find your faculty & connect to campus Wi-Fi",
    detail:
      "Check your timetable with your faculty office, activate your student email and ask IT for campus Wi-Fi access. Your ISC buddy can help you find teaching rooms, the library and the canteen.",
    documents: "Student ID · Student email credentials",
    link: "UTM campus information",
    url: "https://www.utm.ac.mu/",
  },
];

const listings = [
  { id: 1, title: "A quiet studio, close to campus", area: "La Tour Koenig", type: "Studio", price: 9500, walk: "8 min walk to UTM", includes: "Wi-Fi & water included", checkedAt: "2026-11-14" },
  { id: 2, title: "A light-filled room by the coast", area: "Pointe-aux-Sables", type: "Private Room", price: 7500, walk: "12 min by bus to UTM", includes: "Furnished · Shared kitchen", checkedAt: "2026-11-13" },
  { id: 3, title: "Two-bedroom student apartment", area: "Beau Bassin", type: "Shared Apartment", price: 6500, walk: "20 min by bus to UTM", includes: "Water included · 2 students", checkedAt: "2026-09-12" },
  { id: 4, title: "Your own space in Rose Hill", area: "Rose Hill", type: "Studio", price: 12000, walk: "25 min by bus to UTM", includes: "Wi-Fi · Private kitchenette", checkedAt: "2026-11-12" },
  { id: 5, title: "A welcoming home near campus", area: "La Tour Koenig", type: "Private Room", price: 6000, walk: "10 min walk to UTM", includes: "Water included · Shared bathroom", checkedAt: "2026-11-14" },
  { id: 6, title: "Bright apartment near the market", area: "Quatre Bornes", type: "Shared Apartment", price: 8500, walk: "35 min by bus to UTM", includes: "Furnished · Near metro station", checkedAt: "2026-11-11" },
  { id: 7, title: "Coastal studio with a small terrace", area: "Pointe-aux-Sables", type: "Studio", price: 14000, walk: "15 min by bus to UTM", includes: "Wi-Fi & water included", checkedAt: "2026-11-10" },
  { id: 8, title: "Simple, comfortable student room", area: "Beau Bassin", type: "Private Room", price: 6800, walk: "20 min by bus to UTM", includes: "Furnished · Shared kitchen", checkedAt: "2026-11-15" },
  { id: 9, title: "Room in a friendly shared home", area: "Rose Hill", type: "Private Room", price: 8000, walk: "30 min by bus to UTM", includes: "Wi-Fi included · Near bus stop", checkedAt: "2026-11-15" },
  { id: 10, title: "A spacious place to settle in", area: "Quatre Bornes", type: "Studio", price: 18000, walk: "40 min by bus to UTM", includes: "Furnished · Private bathroom", checkedAt: "2026-09-03" },
  { id: 11, title: "Campus-side shared apartment", area: "La Tour Koenig", type: "Shared Apartment", price: 7000, walk: "6 min walk to UTM", includes: "Water included · 3 students", checkedAt: "2026-11-14" },
  { id: 12, title: "A peaceful room with a garden", area: "Pointe-aux-Sables", type: "Private Room", price: 9000, walk: "15 min by bus to UTM", includes: "Wi-Fi included · Shared kitchen", checkedAt: "2026-11-16" },
];

const updates = [
  { id: 1, category: "Official Announcements" as const, title: "Your 2026–27 student handbook is here", description: "From campus essentials to everyday life in Mauritius, find your feet with the updated international student handbook.", meta: "Student Affairs · 3 min read", pinned: false, createdAt: new Date("2026-11-16T09:00:00+04:00") },
  { id: 2, category: "Events" as const, title: "International Students Welcome Mixer", description: "New country, new connections. Meet fellow students and the ISC committee over an easy afternoon of conversation.", meta: "UTM Main Auditorium · 14:00–16:00", pinned: false, createdAt: new Date("2026-11-22T09:00:00+04:00") },
  { id: 3, category: "Weather & Holidays" as const, title: "Weather notice & campus transport updates", description: "Heavy rain advisory for Port Louis and La Tour Koenig. Allow extra travel time, avoid flooded roads and confirm bus services before leaving.", meta: "Campus notice · Check official sources", pinned: true, createdAt: new Date("2026-11-17T09:00:00+04:00") },
];

const volunteers = [
  { id: 1, name: "Priya Ramgoolam", course: "BSc Software Engineering, Yr 3", year: "Yr 3", languages: "English, French & Mauritian Creole", email: "priya.buddy@example.com", capacity: 2 },
  { id: 2, name: "Sameer Seebaluck", course: "BSc Information Systems, Yr 3", year: "Yr 3", languages: "English & Mauritian Creole", email: "sameer.buddy@example.com", capacity: 2 },
  { id: 3, name: "Alicia Morel", course: "BSc Tourism Management, Yr 2", year: "Yr 2", languages: "French & English", email: "alicia.buddy@example.com", capacity: 2 },
];

const buddyRequests = [
  { id: 1, name: "Kudzai Moyo", country: "Zimbabwe", language: "English", arrival: "2026-11-21", programme: "BSc Information Systems", help: ["Campus tour", "Settling in"] },
  { id: 2, name: "Léa Rakoto", country: "Madagascar", language: "French", arrival: "2026-11-24", programme: "BSc Tourism Management", help: ["Airport / transport"] },
];

async function main() {
  const { sql } = await import("drizzle-orm");
  const s = await import("../lib/db");
  const { db } = s;

  await db.insert(s.arrivalTasks).values(arrivalTasks).onConflictDoNothing();
  await db.insert(s.listings).values(listings).onConflictDoNothing();
  await db.insert(s.housingReports).values({ id: 1, listingId: 3, reason: "Contact unreachable", note: "The contact number is not connecting." }).onConflictDoNothing();
  await db.insert(s.clubUpdates).values(updates).onConflictDoNothing();
  await db.insert(s.volunteers).values(volunteers).onConflictDoNothing();
  await db.insert(s.buddyRequests).values(buddyRequests).onConflictDoNothing();
  await db.insert(s.welfareEnquiries).values({
    id: "WLF-2026-014", category: "Academic / Visa Support", urgency: "Standard",
    description: "I would appreciate guidance on the documents for my residence permit renewal.",
    contact: "Email", status: "Acknowledged", createdAt: new Date("2026-11-14T10:00:00+04:00"),
  }).onConflictDoNothing();

  // Explicit ids above don't advance serial sequences; move them past the seeded rows.
  for (const t of ["listings", "housing_reports", "club_updates", "volunteers", "buddy_requests"]) {
    await db.execute(sql.raw(`select setval(pg_get_serial_sequence('${t}', 'id'), greatest((select max(id) from ${t}), 1))`));
  }
  console.log("Seed complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });
