"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { approveWalkInToken, denyWalkInToken } from "@/actions/walk-in-visit";

export function WalkInDecisionButtons({ token }: { token: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: typeof approveWalkInToken) {
    setError(null);
    start(async () => {
      const r = await fn(token);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {error ? (
        <p className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          disabled={pending}
          type="button"
          className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
          onClick={() => run(approveWalkInToken)}
        >
          Aprobar entrada
        </button>
        <button
          disabled={pending}
          type="button"
          className="rounded-xl border border-red-300 bg-white px-6 py-3 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/40"
          onClick={() => run(denyWalkInToken)}
        >
          Denegar entrada
        </button>
      </div>
    </div>
  );
}
