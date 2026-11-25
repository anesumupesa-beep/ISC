import { notFound } from "next/navigation";
import { EditorScreen } from "../../_components/EditorScreen";
import { SECTIONS } from "@/lib/cms/types";

export const metadata = { title: "New content" };

export default async function NewContent({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!SECTIONS[section] || SECTIONS[section] === "page") notFound();
  return <EditorScreen section={section} />;
}
