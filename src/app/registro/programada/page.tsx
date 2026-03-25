import { ScheduledVisitForm } from "@/components/forms/scheduled-visit-form";

export default function ProgramadaPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Programación de visita
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Al guardar se envía un correo a los destinatarios indicados. En recepción, la persona
        muestra su identificación y el oficial comprueba que coincide con lo registrado.
      </p>
      <div className="mt-8">
        <ScheduledVisitForm />
      </div>
    </div>
  );
}
