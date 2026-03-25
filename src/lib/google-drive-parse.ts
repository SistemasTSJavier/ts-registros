/**
 * Extrae el ID de archivo/carpeta de Google Drive desde una URL o texto.
 */
export function extractGoogleDriveFileId(input: string): string | null {
  const t = input.trim();
  if (!t) return null;

  const fromSpreadsheet = t.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (fromSpreadsheet?.[1]) return fromSpreadsheet[1];

  const fromFolders = t.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  if (fromFolders?.[1]) return fromFolders[1];

  const fromFile = t.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  if (fromFile?.[1]) return fromFile[1];

  const fromOpen = t.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (fromOpen?.[1]) return fromOpen[1];

  if (/^[a-zA-Z0-9-_]{15,}$/.test(t)) return t;

  return null;
}
