import { ScheduledTokenScanner } from "@/components/scheduled-token-scanner";

export default function EscaneoProgramadasPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
        Escaneo de cita
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
        Usa el mismo token QR físico de la visita: primer escaneo = entrada,
        segundo escaneo = salida. El estado se guarda automáticamente en Sheets.
      </p>
      <div className="mt-8">
        <ScheduledTokenScanner />
      </div>
    </div>
  );
}
