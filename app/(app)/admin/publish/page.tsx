import { guardPage } from "@/lib/admin/page";
import { PublishForm } from "./PublishForm";

export const metadata = { title: "Publish | Committee" };

// Temporary: the CMS replaces this page (and publishUpdate) with /admin/content.
export default async function PublishPage() {
  await guardPage();
  return <PublishForm />;
}
