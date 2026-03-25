/** Rango de fechas locales para listar visitas programadas próximas. */
export function scheduledVisitListWindow(): { start: Date; end: Date } {
  const n = new Date();
  const start = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 90);
  return { start, end };
}
