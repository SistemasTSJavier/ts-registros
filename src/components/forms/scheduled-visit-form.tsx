"use client";

import { useActionState } from "react";
import Image from "next/image";

import {
  createScheduledVisit,
  type ScheduledVisitActionState,
} from "@/actions/scheduled-visit";

import { inputClass, labelClass, textareaClass } from "./field-styles";

const initial: ScheduledVisitActionState | undefined = undefined;

export function ScheduledVisitForm() {
  const [state, formAction, pending] = useActionState(
    createScheduledVisit,
    initial,
  );

  if (state?.ok) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
        <p className="font-medium">Registro guardado y notificaciones enviadas.</p>
        <p className="mt-2 text-sm opacity-90">
          ID de registro: <code className="rounded bg-white/60 px-1 dark:bg-black/30">{state.id}</code>
        </p>
        <p className="mt-2 text-sm opacity-90">
          Token acceso:{" "}
          <code className="rounded bg-white/60 px-1 dark:bg-black/30">{state.token}</code>
        </p>
        <div className="mt-4 flex justify-center">
          <Image
            alt="QR de acceso"
            src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(state.token)}`}
            width={220}
            height={220}
            unoptimized
          />
        </div>
        <p className="mt-4 text-sm">
          <a className="underline" href="/registro/programada">
            Registrar otra visita
          </a>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mx-auto flex max-w-lg flex-col gap-4">
      {state && !state.ok ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
          {state.error}
        </p>
      ) : null}

      <div>
        <label className={labelClass} htmlFor="subject">
          Asunto
        </label>
        <input required className={inputClass} id="subject" name="subject" />
      </div>

      <div>
        <label className={labelClass} htmlFor="responsible">
          Responsable
        </label>
        <input required className={inputClass} id="responsible" name="responsible" />
      </div>

      <div>
        <label className={labelClass} htmlFor="visitorFullName">
          Nombre completo de quien visita
        </label>
        <input
          required
          className={inputClass}
          id="visitorFullName"
          name="visitorFullName"
          autoComplete="name"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="visitorCompany">
          Empresa
        </label>
        <input
          required
          className={inputClass}
          id="visitorCompany"
          name="visitorCompany"
          autoComplete="organization"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className={labelClass} htmlFor="visitDate">
            Fecha de la visita
          </label>
          <input
            required
            className={inputClass}
            id="visitDate"
            name="visitDate"
            type="date"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="visitStartTime">
            Hora inicio
          </label>
          <input
            required
            className={inputClass}
            id="visitStartTime"
            name="visitStartTime"
            type="time"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="visitEndTime">
            Hora fin
          </label>
          <input
            required
            className={inputClass}
            id="visitEndTime"
            name="visitEndTime"
            type="time"
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="reason">
          Motivo
        </label>
        <textarea
          required
          className={textareaClass}
          id="reason"
          name="reason"
          rows={4}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="identification">
          Identificación
        </label>
        <input
          required
          className={inputClass}
          id="identification"
          name="identification"
          placeholder="INE, pasaporte, folio, etc."
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="visitTo">
          A quién visita
        </label>
        <input required className={inputClass} id="visitTo" name="visitTo" />
      </div>

      <div>
        <label className={labelClass} htmlFor="companions">
          Acompañantes
        </label>
        <input className={inputClass} id="companions" name="companions" />
      </div>

      <div>
        <label className={labelClass} htmlFor="notifyEmails">
          Correos a notificar
        </label>
        <textarea
          required
          className={textareaClass}
          id="notifyEmails"
          name="notifyEmails"
          rows={3}
          placeholder="uno@empresa.com, otro@empresa.com"
        />
      </div>

      <button
        disabled={pending}
        type="submit"
        className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending ? "Guardando…" : "Guardar y enviar correos"}
      </button>
    </form>
  );
}
