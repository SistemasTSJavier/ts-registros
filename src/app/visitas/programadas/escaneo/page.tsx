import { ScheduledTokenScanner } from "@/components/scheduled-token-scanner";

export default function EscaneoProgramadasPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Escaneo de cita programada
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Escanea el token QR compartido al visitante para registrar entrada y salida.
      </p>
      <div className="mt-8">
        <ScheduledTokenScanner />
      </div>
    </div>
  );
}

