import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de seguridad | Tactical Support",
  description:
    "Política de seguridad de Tactical Support para AppWeb Registro de visitas.",
};

const cardClass =
  "rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 dark:border-zinc-800 dark:bg-zinc-900/80 dark:ring-white/5";

export default function PoliticaSeguridadPage() {
  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-slate-100/80 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <header className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-500">
            Tactical Support
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
            Política de seguridad
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
            Vigente desde: 27 de marzo de 2026
          </p>
        </header>

        <section className={`${cardClass} space-y-5 text-sm leading-relaxed text-slate-700 dark:text-zinc-300`}>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-zinc-100">
              1. Control de acceso
            </h2>
            <p className="mt-2">
              El acceso requiere autenticación con Google y autorización por
              roles (admin/oficial), con separación por tenant/servicio.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 dark:text-zinc-100">
              2. Gestión de credenciales
            </h2>
            <p className="mt-2">
              Las credenciales sensibles se administran en variables de entorno
              seguras. No se almacenan contraseñas de usuarios finales en texto
              plano dentro de la aplicación.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 dark:text-zinc-100">
              3. Protección de datos
            </h2>
            <p className="mt-2">
              Se emplean conexiones seguras (HTTPS/TLS) y segmentación lógica de
              datos por servicio para evitar accesos cruzados no autorizados.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 dark:text-zinc-100">
              4. Registro de actividad
            </h2>
            <p className="mt-2">
              Eventos críticos de operación (cambios de workspace, selección,
              aprobaciones, denegaciones) se registran para auditoría.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 dark:text-zinc-100">
              5. Respuesta ante incidentes
            </h2>
            <p className="mt-2">
              En caso de incidente, Tactical Support evalúa alcance, aplica
              contención y corrige las vulnerabilidades detectadas.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 dark:text-zinc-100">
              6. Contacto técnico
            </h2>
            <p className="mt-2">
              Soporte técnico y seguridad:
            </p>
            <p className="mt-1 font-medium">
              Javier Ramirez — +52 814 616 0553
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
