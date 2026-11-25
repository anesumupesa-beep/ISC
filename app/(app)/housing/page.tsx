import { getListings } from "@/lib/data";
import { Housing } from "./Housing";

export const metadata = { title: "Housing Hub" };

export default async function HousingPage() {
  return <Housing listings={await getListings()} />;
}
