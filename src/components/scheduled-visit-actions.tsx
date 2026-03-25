"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  checkInScheduledVisitAction,
  denyScheduledVisitAction,
} from "@/actions/officer-scheduled";

export function ScheduledVisitActions({ visitId }: { visitId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: typeof checkInScheduledVisitAction, id: string) {
    setError(null);
    start(async () => {
      const r = await fn(id);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          disabled={pending}
          type="button"
          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
          onClick={() => run(checkInScheduledVisitAction, visitId)}
        >
          Identidad OK — permitir ingreso
        </button>
        <button
          disabled={pending}
          type="button"
          className="rounded-xl border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/40"
          onClick={() => run(denyScheduledVisitAction, visitId)}
        >
          No coincide — denegar
        </button>
      </div>
    </div>
  );
}
