import { verifySession, getUser } from "@/app/lib/dal";
import { logout } from "@/app/actions/auth";

export default async function DashboardPage() {
  await verifySession();
  const user = await getUser();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <section className="w-full max-w-md space-y-8 text-center">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
            Welcome, <span className="font-semibold">{user?.username}</span>!
          </p>
        </header>

        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You are logged in. This is a protected page that only authenticated
            users can access.
          </p>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="inline-flex justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            Log Out
          </button>
        </form>
      </section>
    </main>
  );
}
