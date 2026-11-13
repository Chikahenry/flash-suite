import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto mt-20 flex max-w-md flex-col items-center gap-3 text-center">
      <h1 className="text-xl font-semibold text-ink-900">Page not found</h1>
      <p className="text-sm text-ink-500">The address does not match any Back Office screen.</p>
      <Link href="/dashboard" className="mt-2 inline-flex h-10 items-center rounded-lg bg-accent-500 px-5 text-sm font-medium text-white hover:bg-accent-600">Go to the dashboard</Link>
    </div>
  );
}
