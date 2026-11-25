import { getArrivalTasks, getCompletedTaskIds } from "@/lib/data";
import { arrivalSections } from "@/lib/ui";
import { Arrival } from "./Arrival";

export const metadata = { title: "Arrival Guide" };

export default async function ArrivalPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const { stage } = await searchParams;
  const [tasks, completed] = await Promise.all([getArrivalTasks(), getCompletedTaskIds()]);
  const initialTab = Math.min(Math.max(Number(stage) || 0, 0), arrivalSections.length - 1);
  return <Arrival tasks={tasks} completed={completed} initialTab={initialTab} />;
}
