import "server-only";
import { db } from "@/lib/db";

type Query = Parameters<typeof db.batch>[0][number];

/** One DB transaction: the mutation(s) and their audit row succeed or fail together. */
export const runBatch = (queries: Query[]) => db.batch(queries as [Query, ...Query[]]);
