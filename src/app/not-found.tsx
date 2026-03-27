export const runtime = 'edge';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-6xl font-bold text-white">404</h1>
      <p className="text-lg text-slate-400">Page not found.</p>
      <a
        href="/"
        className="mt-4 rounded-full border border-sky-400/40 bg-sky-400/10 px-6 py-2 text-sm text-sky-200 hover:bg-sky-400/20 hover:text-white transition-colors"
      >
        Go home
      </a>
    </main>
  );
}
