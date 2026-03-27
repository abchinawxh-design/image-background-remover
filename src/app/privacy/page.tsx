export const runtime = 'edge';

export const metadata = {
  title: "Privacy Policy | Image Background Remover",
  description:
    "Privacy policy for the Image Background Remover MVP website.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-16 text-slate-200">
      <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">
          Privacy Policy
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-white">
          Privacy Policy
        </h1>
        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-300">
          <p>
            This MVP is designed to process images temporarily for background
            removal. We do not intend to keep uploaded files longer than needed
            to complete processing.
          </p>
          <p>
            Uploaded images should only be used to generate the requested
            result. If persistent storage is added later, it should use
            time-limited retention and clear deletion rules.
          </p>
          <p>
            Avoid uploading sensitive personal or confidential images during
            early MVP testing unless you control the deployment environment and
            storage policy.
          </p>
          <p>
            Analytics, logs, and operational metrics may be collected to improve
            performance, reliability, and user experience.
          </p>
          <p>
            If the service later connects to a third-party provider, this page
            should be updated to disclose how files are transmitted and handled.
          </p>
        </div>
      </div>
    </main>
  );
}
