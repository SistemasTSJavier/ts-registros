import { buildScheduledVisitPdf } from "@/lib/simple-pdf";
import { listScheduledInWindow } from "@/lib/sheets-visits";
import { scheduledVisitListWindow } from "@/lib/visit-window";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ visitId: string }> },
) {
  const { visitId: rawVisitId } = await params;
  const visitId = decodeURIComponent(rawVisitId);

  const { start, end } = scheduledVisitListWindow();
  const rows = await listScheduledInWindow(start, end);
  const visit = rows.find((v) => v.tokenOrId === visitId) ?? null;

  if (!visit) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const safeVisitId = visitId.replace(/[^a-zA-Z0-9_-]/g, "");
  const pdf = buildScheduledVisitPdf({
    recordId: visit.recordId,
    status: visit.status,
    createdAt: visit.createdAt,
    updatedAt: visit.updatedAt,
    visitorFullName: visit.visitorFullName,
    visitorCompany: visit.visitorCompany,
    reason: visit.reason,
    idReference: visit.idReference,
    visitDate: new Date(`${visit.visitDate}T12:00:00`),
    visitStartTime: visit.visitStartTime,
    visitEndTime: visit.visitEndTime,
    notifyEmailsCsv: visit.notifyEmails.join(", "),
  });

  const pdfBytes = new Uint8Array(pdf);
  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="registro-programada-${safeVisitId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

