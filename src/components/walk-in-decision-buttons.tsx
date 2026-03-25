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
    <div className="flex flex-col items-center gap-3">
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-3">
        <button
          disabled={pending}
          type="button"
          className="rounded-full bg-emerald-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
          onClick={() => run(approveWalkInToken)}
        >
          Aprobar entrada
        </button>
        <button
          disabled={pending}
          type="button"
          className="rounded-full border border-red-400 px-6 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/40"
          onClick={() => run(denyWalkInToken)}
        >
          Denegar entrada
        </button>
      </div>
    </div>
  );
}
