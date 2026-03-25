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
    <div className="flex flex-col gap-2">
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          disabled={pending}
          type="button"
          className="rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
          onClick={() => run(checkInScheduledVisitAction, visitId)}
        >
          Identidad OK — permitir ingreso
        </button>
        <button
          disabled={pending}
          type="button"
          className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
          onClick={() => run(denyScheduledVisitAction, visitId)}
        >
          No coincide — denegar
        </button>
      </div>
    </div>
  );
}
