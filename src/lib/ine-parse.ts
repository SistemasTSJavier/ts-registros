/** CURP mexicano (18 caracteres); tolerante a ruido de OCR. */
const CURP_REGEX =
  /\b([A-ZÑ]{4}\d{6}[HM][A-ZÑ]{5}[0-9A-ZÑ][0-9A-Z0-9])\b/i;

export function extractCurpFromOcr(text: string): string | null {
  const normalized = text.toUpperCase().replace(/\s+/g, " ");
  const m = normalized.match(CURP_REGEX);
  return m ? m[1] : null;
}

/**
 * Heurística muy simple: líneas que parezcan nombre (mayúsculas, sin dígitos).
 */
export function guessFullNameFromOcr(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const candidates = lines.filter(
    (l) =>
      l.length > 5 &&
      l.length < 80 &&
      !/\d{4,}/.test(l) &&
      /^[A-ZÁÉÍÓÚÑa-záéíóúñ\s.,]+$/.test(l),
  );

  return candidates[0] ?? null;
}
