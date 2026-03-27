import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidad | Tactical Support",
  description:
    "Política de privacidad de Tactical Support para AppWeb Registro de visitas.",
};

const cardClass =
  "rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 dark:border-zinc-800 dark:bg-zinc-900/80 dark:ring-white/5";

export default function PoliticaPrivacidadPage() {
  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-slate-100/80 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <header className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-500">
            Tactical Support
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
            Política de privacidad
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
            Vigente desde: 27 de marzo de 2026
          </p>
        </header>

        <section className={`${cardClass} space-y-5 text-sm leading-relaxed text-slate-700 dark:text-zinc-300`}>
          <p>
            Esta política describe cómo Tactical Support recopila, usa y protege
            la información tratada por la aplicación web de registro de visitas.
          </p>

          <div>
            <h2 className="font-semibold text-slate-900 dark:text-zinc-100">
              1. Datos que procesamos
            </h2>
            <p className="mt-2">
              Datos de identificación del usuario autenticado, datos de visitas
              (nombre, empresa, motivo, horarios, identificadores), correos de
              notificación y evidencias de operación (tokens, estados de acceso).
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 dark:text-zinc-100">
              2. Finalidad del tratamiento
            </h2>
            <p className="mt-2">
              Gestionar el control de accesos, registrar entradas/salidas,
              notificar responsables y conservar trazabilidad operativa.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 dark:text-zinc-100">
              3. Bases y servicios utilizados
            </h2>
            <p className="mt-2">
              La aplicación utiliza Google OAuth para autenticación, Google
              Sheets/Drive para almacenamiento operativo y Supabase/PostgreSQL
              para configuración, roles y control multi-tenant.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 dark:text-zinc-100">
              4. Conservación y acceso
            </h2>
            <p className="mt-2">
              Los datos se conservan por el tiempo necesario para operación,
              seguridad y cumplimiento interno. El acceso se limita por roles
              (admin/oficial) y por tenant/servicio.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 dark:text-zinc-100">
              5. Derechos y contacto
            </h2>
            <p className="mt-2">
              Para consultas sobre privacidad, corrección o eliminación de
              información, contacte a:
            </p>
            <p className="mt-1 font-medium">
              Javier Ramirez — +52 814 616 0553
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 dark:text-zinc-100">
              6. Cambios a esta política
            </h2>
            <p className="mt-2">
              Tactical Support puede actualizar este documento por mejoras
              legales, operativas o de seguridad. La versión vigente estará
              siempre publicada en esta URL.
            </p>
          </div>
        </section>

        <p className="mt-8 text-sm text-slate-600 dark:text-zinc-400">
          <Link href="/" className="font-medium underline underline-offset-4 hover:no-underline">
            Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
