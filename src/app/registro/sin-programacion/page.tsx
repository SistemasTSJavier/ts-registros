import { WalkInVisitForm } from "@/components/forms/walk-in-visit-form";

export default function SinProgramacionPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Entrada sin programación
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Opcional: sube una foto de la INE para prellenar datos con OCR. El oficial debe
        validar contra la credencial. Al guardar se notifica al correo que decidirá la
        entrada.
      </p>
      <div className="mt-8">
        <WalkInVisitForm />
      </div>
    </div>
  );
}
