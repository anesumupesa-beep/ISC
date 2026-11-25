"use client";
import { Action } from "@/components/ui";

// Never print error.message: it could leak SQL.
export default function AdminError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="surface empty-state" role="alert">
      <h2>Something went wrong</h2>
      <p>The committee workspace could not load this section. Nothing was changed.</p>
      <Action variant="navy" onClick={() => retry()}>Try again</Action>
    </div>
  );
}
