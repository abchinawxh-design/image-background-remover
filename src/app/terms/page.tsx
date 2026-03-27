export const runtime = 'edge';

export const metadata = {
  title: "Terms of Service | Image Background Remover",
  description: "Terms of service for the Image Background Remover MVP website.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-16 text-slate-200">
      <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">
          Terms of Service
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-white">
          Terms of Service
        </h1>
        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-300">
          <p>
            This website is provided as an MVP demonstration for background
            removal workflows. Availability, performance, and output quality are
            not guaranteed.
          </p>
          <p>
            You are responsible for ensuring you have the right to upload and
            process any image you submit.
          </p>
          <p>
            Do not use the service for unlawful, abusive, or harmful content.
          </p>
          <p>
            The current version may run in mock mode for testing purposes,
            meaning the returned result can match the original image until a
            production provider is integrated.
          </p>
          <p>
            Future commercial, subscription, API, or retention terms may be
            added as the product evolves beyond MVP.
          </p>
        </div>
      </div>
    </main>
  );
}
