import { auth, signIn } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";

async function signInWithGoogle() {
  "use server";
  await signIn("google", { redirectTo: "/" });
}

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16 font-sans dark:bg-zinc-950">
      {session?.user ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {session.user.email ?? session.user.name}
          </p>
          <SignOutButton />
        </div>
      ) : (
        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="rounded-full bg-zinc-900 px-8 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Iniciar sesión
          </button>
        </form>
      )}
    </div>
  );
}
