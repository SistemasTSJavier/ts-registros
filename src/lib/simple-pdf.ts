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

function textWidthApprox(s: string, fontSize: number): number {
  // Aproximación para Helvetica Type1 (suficiente para centrar títulos y recortar columnas).
  return normalizeToAscii(s).length * fontSize * 0.52;
}

function truncateToWidth(s: string, fontSize: number, maxWidth: number): string {
  const t = normalizeToAscii(s);
  if (textWidthApprox(t, fontSize) <= maxWidth) return t;
  let out = t;
  while (out.length > 1 && textWidthApprox(`${out}...`, fontSize) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}...`;
}

function buildSinglePagePdf(args: {
  title: string;
  subtitle?: string;
  rows: Array<{ label: string; value: string }>;
}): Buffer {
  const titleRaw = normalizeToAscii(args.title);
  const subtitleRaw = args.subtitle ? normalizeToAscii(args.subtitle) : "";
  const rows = args.rows.map((r) => ({
    label: normalizeToAscii(r.label),
    value: normalizeToAscii(r.value),
  }));

  // Página estándar: letter-like (72dpi) 612x792.
  const pageW = 612;
  const pageH = 792;
  const margin = 48;
  const tableW = pageW - margin * 2;
  const labelW = 175;
  const rowH = 22;
  const titleSize = 18;
  const subtitleSize = 11;
  const textSize = 10;

  const contentParts: string[] = [];
  const titleX = (pageW - textWidthApprox(titleRaw, titleSize)) / 2;
  let yTop = pageH - 72;
  contentParts.push("BT");
  contentParts.push(`/F1 ${titleSize} Tf`);
  contentParts.push(`${titleX.toFixed(2)} ${yTop.toFixed(2)} Td`);
  contentParts.push(`(${pdfEscapeText(titleRaw)}) Tj`);
  contentParts.push("ET");
  yTop -= 24;

  if (subtitleRaw) {
    const subX = (pageW - textWidthApprox(subtitleRaw, subtitleSize)) / 2;
    contentParts.push("BT");
    contentParts.push(`/F1 ${subtitleSize} Tf`);
    contentParts.push(`${subX.toFixed(2)} ${yTop.toFixed(2)} Td`);
    contentParts.push(`(${pdfEscapeText(subtitleRaw)}) Tj`);
    contentParts.push("ET");
    yTop -= 22;
  }

  // Encabezado de tabla.
  const x0 = margin;
  const x1 = margin + labelW;
  const x2 = margin + tableW;
  const headerY = yTop;
  const tableStartY = headerY - rowH;

  // Bordes encabezado.
  contentParts.push(`${x0} ${headerY} m ${x2} ${headerY} l S`);
  contentParts.push(`${x0} ${tableStartY} m ${x2} ${tableStartY} l S`);
  contentParts.push(`${x0} ${headerY} m ${x0} ${tableStartY} l S`);
  contentParts.push(`${x1} ${headerY} m ${x1} ${tableStartY} l S`);
  contentParts.push(`${x2} ${headerY} m ${x2} ${tableStartY} l S`);

  contentParts.push("BT");
  contentParts.push(`/F1 ${textSize} Tf`);
  contentParts.push(`${(x0 + 8).toFixed(2)} ${(tableStartY + 7).toFixed(2)} Td`);
  contentParts.push(`(${pdfEscapeText("Campo")}) Tj`);
  contentParts.push("ET");

  contentParts.push("BT");
  contentParts.push(`/F1 ${textSize} Tf`);
  contentParts.push(`${(x1 + 8).toFixed(2)} ${(tableStartY + 7).toFixed(2)} Td`);
  contentParts.push(`(${pdfEscapeText("Valor")}) Tj`);
  contentParts.push("ET");

  // Filas de datos.
  let currentTop = tableStartY;
  const valueMaxW = x2 - x1 - 16;
  const labelMaxW = x1 - x0 - 16;
  for (const row of rows) {
    const nextY = currentTop - rowH;
    contentParts.push(`${x0} ${nextY} m ${x2} ${nextY} l S`);
    contentParts.push(`${x0} ${currentTop} m ${x0} ${nextY} l S`);
    contentParts.push(`${x1} ${currentTop} m ${x1} ${nextY} l S`);
    contentParts.push(`${x2} ${currentTop} m ${x2} ${nextY} l S`);

    const label = truncateToWidth(row.label, textSize, labelMaxW);
    const value = truncateToWidth(row.value || "-", textSize, valueMaxW);

    contentParts.push("/F1 11 Tf");
    contentParts.push("BT");
    contentParts.push(`/F1 ${textSize} Tf`);
    contentParts.push(`${(x0 + 8).toFixed(2)} ${(nextY + 7).toFixed(2)} Td`);
    contentParts.push(`(${pdfEscapeText(label)}) Tj`);
    contentParts.push("ET");

    contentParts.push("BT");
    contentParts.push(`/F1 ${textSize} Tf`);
    contentParts.push(`${(x1 + 8).toFixed(2)} ${(nextY + 7).toFixed(2)} Td`);
    contentParts.push(`(${pdfEscapeText(value)}) Tj`);
    contentParts.push("ET");

    currentTop = nextY;
  }

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

  const rows: Array<{ label: string; value: string }> = [
    { label: "Token", value: args.token },
    { label: "ID registro", value: args.recordId },
    { label: "Estado", value: args.status },
    { label: "Persona", value: args.visitorFullName },
    { label: "Empresa", value: args.visitorCompany },
    { label: "Motivo", value: args.reason },
    { label: "CURP/ID", value: args.curpOrId ?? "-" },
    { label: "Correo aprobación", value: args.approvalEmail },
    { label: "Resuelto", value: resolvedLine.replace("Resuelto: ", "") },
  ];

  return buildSinglePagePdf({
    title: args.title ?? "Registro de entrada sin programación",
    rows,
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
  const rows: Array<{ label: string; value: string }> = [
    { label: "ID registro", value: args.recordId },
    { label: "Estado", value: args.status },
    { label: "Persona", value: args.visitorFullName },
    { label: "Empresa", value: args.visitorCompany },
    { label: "Fecha", value: args.visitDate.toLocaleDateString("es-MX") },
    { label: "Horario", value: `${args.visitStartTime} - ${args.visitEndTime}` },
    { label: "Motivo", value: args.reason },
    { label: "Identificación a verificar", value: args.idReference ?? "-" },
    { label: "Notificar a", value: args.notifyEmailsCsv },
    { label: "Creado", value: args.createdAt.toLocaleString("es-MX") },
    { label: "Actualizado", value: args.updatedAt.toLocaleString("es-MX") },
  ];

  return buildSinglePagePdf({
    title: args.title ?? "Visita programada",
    rows,
  });
}

