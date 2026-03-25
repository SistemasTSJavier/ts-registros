"use client";

import { useActionState, useCallback, useState } from "react";
import { createWorker } from "tesseract.js";

import { createWalkInVisit, type WalkInActionState } from "@/actions/walk-in-visit";
import { extractCurpFromOcr, guessFullNameFromOcr } from "@/lib/ine-parse";

import { inputClass, labelClass, textareaClass } from "./field-styles";

const initial: WalkInActionState | undefined = undefined;

const formCard =
  "rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900/80 dark:ring-white/5";

const submitClass =
  "rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white";

export function WalkInVisitForm() {
  const [state, formAction, pending] = useActionState(createWalkInVisit, initial);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrHint, setOcrHint] = useState<string | null>(null);

  const onIneFile = useCallback(async (file: File | null) => {
    if (!file) return;
    setOcrHint(null);
    setOcrBusy(true);
    try {
      const worker = await createWorker("spa");
      const {
        data: { text },
      } = await worker.recognize(file);
      await worker.terminate();

      const curp = extractCurpFromOcr(text);
      const guessName = guessFullNameFromOcr(text);

      const nameInput = document.getElementById(
        "visitorFullName",
      ) as HTMLInputElement | null;
      const curpInput = document.getElementById("curpOrId") as HTMLInputElement | null;
      const rawInput = document.getElementById("ineOcrRaw") as HTMLTextAreaElement | null;

      if (rawInput) rawInput.value = text;
      if (curp && curpInput && !curpInput.value) curpInput.value = curp;
      if (guessName && nameInput && !nameInput.value) nameInput.value = guessName;

      setOcrHint(
        curp || guessName
          ? "Se rellenaron campos a partir del OCR. Verifica todo con la credencial."
          : "No se detectó CURP o nombre con certeza; revisa el texto OCR o captura manualmente.",
      );
    } catch {
      setOcrHint(
        "No se pudo leer la imagen. Puedes capturar nombre e identificación a mano.",
      );
    } finally {
      setOcrBusy(false);
    }
  }, []);

  if (state?.ok) {
    return (
      <div
        className={`${formCard} border-emerald-200/90 bg-emerald-50/90 text-center text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/35 dark:text-emerald-100`}
      >
        <p className="font-semibold">Registro enviado al correo de aprobación.</p>
        <p className="mt-3 text-sm opacity-90">
          ID:{" "}
          <code className="rounded-lg bg-white/70 px-2 py-0.5 font-mono text-xs dark:bg-black/30">
            {state.id}
          </code>
        </p>
        <p className="mt-6 text-sm">
          <a
            className="font-medium text-emerald-800 underline-offset-4 hover:underline dark:text-emerald-200"
            href="/registro/sin-programacion"
          >
            Registrar otra entrada
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className={formCard}>
      <form action={formAction} className="mx-auto flex max-w-lg flex-col gap-5">
        {state && !state.ok ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
            {state.error}
          </p>
        ) : null}

        <div>
          <label className={labelClass} htmlFor="inePhoto">
            Foto de identificación (INE)
          </label>
          <input
            accept="image/*"
            capture="environment"
            className={inputClass}
            id="inePhoto"
            type="file"
            onChange={(e) => onIneFile(e.target.files?.[0] ?? null)}
          />
          <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">
            {ocrBusy
              ? "Leyendo imagen…"
              : "Opcional: ayuda a prellenar datos; el oficial debe validar contra la credencial física."}
          </p>
          {ocrHint ? (
            <p className="mt-2 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              {ocrHint}
            </p>
          ) : null}
        </div>

        <textarea
          className="hidden"
          id="ineOcrRaw"
          name="ineOcrRaw"
          readOnly
          defaultValue=""
        />

        <div>
          <label className={labelClass} htmlFor="visitorFullName">
            Nombre completo
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

        <div>
          <label className={labelClass} htmlFor="curpOrId">
            CURP o identificador
          </label>
          <input className={inputClass} id="curpOrId" name="curpOrId" />
        </div>

        <div>
          <label className={labelClass} htmlFor="reason">
            Motivo de la visita
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
          <label className={labelClass} htmlFor="approvalEmail">
            Correo que aprueba o niega la entrada
          </label>
          <input
            required
            className={inputClass}
            id="approvalEmail"
            name="approvalEmail"
            type="email"
            autoComplete="email"
          />
        </div>

        <button disabled={pending || ocrBusy} type="submit" className={submitClass}>
          {pending ? "Enviando…" : "Guardar y notificar por correo"}
        </button>
      </form>
    </div>
  );
}
