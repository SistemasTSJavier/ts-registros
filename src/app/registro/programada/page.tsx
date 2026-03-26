import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getUserEmail, isAdminEmail } from "@/lib/access";
import { ScheduledVisitForm } from "@/components/forms/scheduled-visit-form";

export default async function ProgramadaPage() {
  const session = await auth();
  const email = getUserEmail(session);
  if (!(await isAdminEmail(email))) {
    redirect("/visitas/programadas");
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
        Programación de visita
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
        Al guardar se envían correos desde tu cuenta de Google. En recepción, la persona
        muestra su identificación y el oficial comprueba que coincide con lo registrado.
      </p>
      <div className="mt-8">
        <ScheduledVisitForm />
      </div>
    </div>
  );
}
