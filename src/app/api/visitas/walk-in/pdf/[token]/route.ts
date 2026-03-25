import { buildWalkInVisitPdf } from "@/lib/simple-pdf";
import { getWalkInByToken } from "@/lib/sheets-visits";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);

  const visit = await getWalkInByToken(token);

  if (!visit) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const safeToken = token.replace(/[^a-zA-Z0-9_-]/g, "");
  const pdf = buildWalkInVisitPdf({
    token: visit.tokenOrId,
    recordId: visit.recordId,
    status: visit.status,
    resolvedAt: visit.resolvedAt,
    visitorFullName: visit.visitorFullName,
    visitorCompany: visit.visitorCompany,
    reason: visit.reason,
    curpOrId: visit.curpOrId,
    approvalEmail: visit.approvalEmail,
  });

  const pdfBytes = new Uint8Array(pdf);
  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="registro-walk-in-${safeToken}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

