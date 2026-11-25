// Static UI constants (not DB data), ported from the prototype's src/data.ts.
import type { IconName } from "@/components/icons";

export const navigation: { page: string; href: string; short: string; icon: IconName }[] = [
  { page: "Overview", href: "/", short: "Home", icon: "home" },
  { page: "Arrival Guide", href: "/arrival", short: "Arrival", icon: "arrival" },
  { page: "Housing Hub", href: "/housing", short: "Housing", icon: "housing" },
  { page: "Buddy Support", href: "/buddy", short: "Buddy", icon: "buddy" },
  { page: "Club Updates", href: "/updates", short: "Updates", icon: "updates" },
  { page: "Welfare Enquiry", href: "/welfare", short: "Welfare", icon: "shield" },
];

export const arrivalSections = [
  "Before Arrival",
  "First 48 Hours",
  "Week 1 in Mauritius",
  "UTM Campus Onboarding",
];

export const housingAreas = [
  "All Areas",
  "La Tour Koenig",
  "Pointe-aux-Sables",
  "Beau Bassin",
  "Rose Hill",
  "Quatre Bornes",
];
export const housingBudgets = [6000, 8000, 10000, 12000, 15000, 18000];
export const roomTypes = ["All Room Types", "Private Room", "Shared Apartment", "Studio"];
export const reportReasons = [
  "Contact unreachable",
  "Rent price changed",
  "Room already taken",
  "Inaccurate details",
];

export const buddyLanguages = [
  "English",
  "French",
  "Mauritian Creole",
  "Hindi",
  "Other — discuss with committee",
];
export const buddyHelpOptions = ["Airport / transport", "Campus tour", "Settling in"];

export const updateFilters = [
  "All",
  "Official Announcements",
  "Events",
  "Weather & Holidays",
  "ISC Membership",
];

export const welfareCategories = [
  "Accommodation Crisis",
  "Financial / Tuition",
  "Health & Wellbeing",
  "Academic / Visa Support",
  "Personal / Safety",
];
export const enquiryStatuses = ["Submitted", "Acknowledged", "Referred to Counsellor"] as const;

export const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("");
