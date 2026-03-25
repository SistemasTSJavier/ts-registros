import { ScheduledTokenScanner } from "@/components/scheduled-token-scanner";

export default function EscaneoProgramadasPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
        Escaneo de cita
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
        Primer escaneo registra entrada; el segundo, salida. El token queda
        consumido al completar el ciclo.
      </p>
      <div className="mt-8">
        <ScheduledTokenScanner />
      </div>
    </div>
  );
}
