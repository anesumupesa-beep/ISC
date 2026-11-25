import { logAudit } from "@/lib/admin/audit";
import { toCsv } from "@/lib/admin/csv";
import { getExportRows, type ExportKind } from "@/lib/admin/data-people";
import { adminGate } from "@/lib/admin/guard";
import { todayMu } from "@/lib/admin/format";

const KINDS: ExportKind[] = ["members", "volunteers", "kpis"];

// No body detail on failures: nothing here may confirm what exists or leak data.
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const g = await adminGate();
  if (!g.ok) return new Response(null, { status: g.result.ok ? 403 : g.result.error.startsWith("Please sign in") ? 401 : 403 });
  const { kind } = await params;
  if (!KINDS.includes(kind as ExportKind)) return new Response(null, { status: 404 });
  const { header, rows } = await getExportRows(kind as ExportKind);
  await logAudit({
    actorId: g.viewer.userId, actorName: g.viewer.name, entityType: "export", entityId: kind,
    action: `export.${kind}`, summary: `Exported ${kind} (${rows.length} rows)`, detail: { rows: rows.length },
  });
  return new Response(toCsv(header, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="isc-${kind}-${todayMu()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
