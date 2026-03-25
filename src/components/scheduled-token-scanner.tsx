"use client";

import { useState, useTransition } from "react";

import { scanScheduledTokenAction } from "@/actions/officer-scheduled";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-400/25 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500";

export function ScheduledTokenScanner() {
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setMsg(null);
    setErr(null);
    start(async () => {
      const r = await scanScheduledTokenAction(token);
      if (r.ok) {
        setMsg(r.message);
        setToken("");
      } else {
        setErr(r.error);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 dark:border-zinc-800 dark:bg-zinc-900/80 dark:ring-white/5">
      <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-50">
        Validar token
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
        Primer escaneo: entrada. Segundo escaneo: salida. Luego el token queda
        consumido.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Escanea o pega el token"
          className={inputClass}
        />
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="shrink-0 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {pending ? "Procesando…" : "Validar"}
        </button>
      </div>

      {msg ? (
        <p className="mt-4 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
          {msg}
        </p>
      ) : null}
      {err ? (
        <p className="mt-4 rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          {err}
        </p>
      ) : null}
    </div>
  );
}
