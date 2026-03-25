"use client";

import { useState, useTransition } from "react";

import { scanScheduledTokenAction } from "@/actions/officer-scheduled";

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
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-medium">Escaneo de token (entrada/salida)</h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Primer escaneo: entrada. Segundo escaneo: salida. Luego queda consumido.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Escanea o pega token"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-400 focus:border-zinc-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500"
        />
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {pending ? "Procesando..." : "Validar token"}
        </button>
      </div>

      {msg ? <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{msg}</p> : null}
      {err ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{err}</p> : null}
    </div>
  );
}

