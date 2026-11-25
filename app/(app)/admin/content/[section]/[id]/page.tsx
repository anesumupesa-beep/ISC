import { EditorScreen } from "../../_components/EditorScreen";

export const metadata = { title: "Edit content" };

export default async function EditContent({ params }: { params: Promise<{ section: string; id: string }> }) {
  const { section, id } = await params;
  return <EditorScreen section={section} id={id} />;
}
