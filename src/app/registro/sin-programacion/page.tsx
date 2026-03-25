import { WalkInVisitForm } from "@/components/forms/walk-in-visit-form";

export default function SinProgramacionPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
        Entrada sin programación
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
        Opcional: foto de INE para prellenar datos con OCR. El oficial debe validar contra la
        credencial. Al guardar se notifica al correo que aprobará o denegará la entrada.
      </p>
      <div className="mt-8">
        <WalkInVisitForm />
      </div>
    </div>
  );
}
