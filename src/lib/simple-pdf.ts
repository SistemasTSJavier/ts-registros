function normalizeToAscii(s: string): string {
  // Quita acentos y caracteres raros para evitar problemas con fuentes Type1.
  const withoutDiacritics = s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  return withoutDiacritics.replace(/[^\x20-\x7E]/g, (ch) => {
    // Ajustes mínimos para legibilidad.
    switch (ch) {
      case "—":
        return "-";
      case "¿":
        return "?";
      case "¡":
        return "!";
      default:
        return "";
    }
  });
}

function pdfEscapeText(s: string): string {
  // En strings PDF: escapamos \ y parens.
  return normalizeToAscii(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildSinglePagePdf(args: {
  title: string;
  subtitle?: string;
  lines: string[];
}): Buffer {
  const title = pdfEscapeText(args.title);
  const subtitle = args.subtitle ? pdfEscapeText(args.subtitle) : "";
  const lines = args.lines.map((l) => pdfEscapeText(l));

  // Página estándar: letter-like (72dpi) 612x792.
  const pageW = 612;
  const pageH = 792;

  // Diseño básico: margen izquierdo 48, arriba y espaciado.
  let y = pageH - 72;
  const x = 48;
  const leading = 16;

  const contentParts: string[] = [];
  contentParts.push("BT");
  contentParts.push("/F1 18 Tf");
  contentParts.push(`${x} ${y} Td`);
  contentParts.push(`(${title}) Tj`);
  y -= leading * 1.3;

  if (subtitle) {
    contentParts.push("/F1 11 Tf");
    contentParts.push(`${0} ${-leading} Td`);
    contentParts.push(`(${subtitle}) Tj`);
    y -= leading;
  }

  contentParts.push("/F1 11 Tf");
  for (const line of lines) {
    contentParts.push(`${0} ${-leading} Td`);
    contentParts.push(`(${line}) Tj`);
  }
  contentParts.push("ET");

  const contentStream = contentParts.join("\n") + "\n";
  const contentBytes = Buffer.from(contentStream, "utf8");

  const objects: string[] = [];
  objects.push(""); // object 0 reserved for xref

  objects.push(
    `1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
`,
  );
  objects.push(
    `2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
`,
  );
  objects.push(
    `3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
`,
  );
  objects.push(
    `4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
`,
  );

  // Stream length usa bytes, no caracteres.
  objects.push(
    `5 0 obj
<< /Length ${contentBytes.length} >>
stream
${contentStream}endstream
endobj
`,
  );

  // Construimos el PDF y calculamos offsets para xref.
  let pdf = "%PDF-1.3\n";
  const offsets: number[] = [0];

  for (let i = 1; i < objects.length; i++) {
    offsets[i] = Buffer.byteLength(pdf, "utf8");
    pdf += objects[i];
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  const size = objects.length;

  let xref = `xref\n0 ${size}\n`;
  // obj 0
  xref += "0000000000 65535 f \n";
  for (let i = 1; i < size; i++) {
    const off = offsets[i] ?? 0;
    xref += `${String(off).padStart(10, "0")} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  pdf += xref + trailer;

  return Buffer.from(pdf, "utf8");
}

export function buildWalkInVisitPdf(args: {
  title?: string;
  token: string;
  recordId: string;
  status: string;
  resolvedAt: Date | null;
  visitorFullName: string;
  visitorCompany: string;
  reason: string;
  curpOrId: string | null;
  approvalEmail: string;
}): Buffer {
  const resolvedLine = args.resolvedAt
    ? `Resuelto: ${args.resolvedAt.toLocaleString("es-MX")}`
    : "Resuelto: (pendiente)";

  const lines: string[] = [
    `Token: ${args.token}`,
    `ID registro: ${args.recordId}`,
    `Estado: ${args.status}`,
    `Persona: ${args.visitorFullName}`,
    `Empresa: ${args.visitorCompany}`,
    `Motivo: ${args.reason}`,
  ];
  if (args.curpOrId) lines.push(`CURP/ID: ${args.curpOrId}`);
  lines.push(`Correo aprobación: ${args.approvalEmail}`);
  lines.push(resolvedLine);

  return buildSinglePagePdf({
    title: args.title ?? "Registro de entrada sin programación",
    lines,
  });
}

export function buildScheduledVisitPdf(args: {
  title?: string;
  recordId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  visitorFullName: string;
  visitorCompany: string;
  reason: string;
  idReference: string | null;
  visitDate: Date;
  visitStartTime: string;
  visitEndTime: string;
  notifyEmailsCsv: string;
}): Buffer {
  const lines: string[] = [
    `ID registro: ${args.recordId}`,
    `Estado: ${args.status}`,
    `Persona: ${args.visitorFullName}`,
    `Empresa: ${args.visitorCompany}`,
    `Fecha: ${args.visitDate.toLocaleDateString("es-MX")}`,
    `Horario: ${args.visitStartTime} - ${args.visitEndTime}`,
    `Motivo: ${args.reason}`,
  ];

  if (args.idReference) lines.push(`Identificación a verificar: ${args.idReference}`);
  lines.push(`Notificar a: ${args.notifyEmailsCsv}`);
  lines.push(`Creado: ${args.createdAt.toLocaleString("es-MX")}`);
  lines.push(`Actualizado: ${args.updatedAt.toLocaleString("es-MX")}`);

  return buildSinglePagePdf({
    title: args.title ?? "Visita programada",
    lines,
  });
}

