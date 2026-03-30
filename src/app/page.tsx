"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

type UploadState = "idle" | "uploading" | "success" | "error";

const maxSizeLabel = "10MB";
const supportedFormats = "JPG, PNG, WebP";

const faqs = [
  {
    q: "Which formats are supported?",
    a: "You can upload JPG, JPEG, PNG, and WebP images up to 10MB.",
  },
  {
    q: "Do I need to create an account?",
    a: "No. This MVP is intentionally frictionless, so you can try it without signing in.",
  },
  {
    q: "Is the current version using real AI background removal?",
    a: "The app is wired for a real provider, but local test mode currently returns the original image until a provider API is connected.",
  },
  {
    q: "Will my image be stored forever?",
    a: "No. This MVP is designed for temporary processing only and should be configured with short-lived storage if persistence is added later.",
  },
];

function checkerboardBackground() {
  return {
    backgroundImage:
      "linear-gradient(45deg, rgba(148,163,184,0.16) 25%, transparent 25%), linear-gradient(-45deg, rgba(148,163,184,0.16) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(148,163,184,0.16) 75%), linear-gradient(-45deg, transparent 75%, rgba(148,163,184,0.16) 75%)",
    backgroundSize: "24px 24px",
    backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0px",
  };
}

export default function Home() {
  const { data: session } = useSession();
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [originalName, setOriginalName] = useState<string>("");
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>("image-no-bg.png");
  const [resultPreview, setResultPreview] = useState<string | null>(null);
  const [resultNote, setResultNote] = useState<string | null>(null);

  const isBusy = status === "uploading";

  const helperText = useMemo(() => {
    if (status === "uploading") return "Removing background…";
    if (status === "success") return "Done. Review the result and download it.";
    if (status === "error") return error ?? "Something went wrong.";
    return `Supports ${supportedFormats}. Max file size: ${maxSizeLabel}.`;
  }, [status, error]);

  async function processFile(file: File) {
    setError(null);
    setStatus("uploading");
    setOriginalName(file.name);

    const objectUrl = URL.createObjectURL(file);
    setOriginalPreview(objectUrl);

    try {
      if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
        throw new Error("Unsupported file format. Please upload JPG, PNG, or WebP.");
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File is too large. Please upload an image under 10MB.");
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/remove-background", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to remove background. Please try again.");
      }

      const baseName = (file.name || "image")
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "image";

      setResultPreview(data.resultUrl);
      setDownloadName(data.filename || `${baseName}-no-bg.png`);
      if (data.note) setResultNote(data.note);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setResultPreview(null);
      setDownloadName("image-preview.png");
      setResultNote(null);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to process the image. Please try again."
      );
    }
  }

  function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void processFile(file);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    void processFile(file);
  }

  return (
    <main className="min-h-screen">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 py-10 md:px-10 lg:px-12">
        <header className="flex flex-col gap-4 rounded-full border border-white/10 bg-white/5 px-5 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">
              Image Background Remover
            </p>
            <p className="text-sm text-slate-300">
              Fast MVP for removing image backgrounds online.
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <a className="hover:text-white" href="#upload">
              Upload
            </a>
            <a className="hover:text-white" href="#faq">
              FAQ
            </a>
            <a className="hover:text-white" href="/privacy">
              Privacy
            </a>
            <a className="hover:text-white" href="/terms">
              Terms
            </a>
            {session?.user && (
              <a className="hover:text-white" href="/dashboard">
                Dashboard
              </a>
            )}
            {session?.user ? (
              <div className="flex items-center gap-3">
                <a href="/dashboard" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                  {session.user.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt={session.user.name ?? "User avatar"}
                      className="h-7 w-7 rounded-full border border-white/20"
                    />
                  )}
                  <span className="text-slate-300">{session.user.name ?? session.user.email}</span>
                </a>
                <button
                  onClick={() => void signOut()}
                  className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-sm text-slate-200 hover:bg-white/10 hover:text-white transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => void signIn("google")}
                className="rounded-full border border-sky-400/40 bg-sky-400/10 px-4 py-1.5 text-sm text-sky-200 hover:bg-sky-400/20 hover:text-white transition-colors"
              >
                Sign in with Google
              </button>
            )}
          </nav>
        </header>

        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm text-sky-200">
              Remove background from image in seconds
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                Upload an image. Remove the background. Download the result.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                This MVP focuses on one thing: making background removal feel
                instant and simple. It is built with Next.js and Tailwind CSS,
                and the current hosted version keeps the full upload/preview
                flow available in lightweight demo mode.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-300">
              <span className="rounded-full border border-white/10 px-4 py-2">
                No sign-up required
              </span>
              <span className="rounded-full border border-white/10 px-4 py-2">
                {supportedFormats}
              </span>
              <span className="rounded-full border border-white/10 px-4 py-2">
                Max {maxSizeLabel}
              </span>
            </div>
          </div>

          <section
            id="upload"
            className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-sky-950/20 backdrop-blur"
          >
            <div className="mb-5 space-y-2">
              <h2 className="text-2xl font-semibold text-white">Try it now</h2>
              <p className="text-sm leading-6 text-slate-300">{helperText}</p>
            </div>

            <label
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed px-6 py-10 text-center transition ${
                dragging
                  ? "border-sky-300 bg-sky-400/10"
                  : "border-white/15 bg-white/5 hover:border-sky-300/60 hover:bg-white/8"
              }`}
            >
              <div className="space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-400/15 text-2xl">
                  ✨
                </div>
                <div>
                  <p className="text-lg font-medium text-white">
                    Drag & drop an image here
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    or click to choose one from your device
                  </p>
                </div>
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  {supportedFormats} · Max {maxSizeLabel}
                </div>
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={onFileInput}
                disabled={isBusy}
              />
            </label>

            {resultNote ? (
              <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
                {resultNote}
              </div>
            ) : null}
          </section>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <PreviewCard
            title="Original image"
            subtitle={originalName || "Upload an image to preview it here."}
            imageUrl={originalPreview}
            emptyLabel="Your source image preview will appear here."
          />
          <PreviewCard
            title="Processed result"
            subtitle={
              status === "success"
                ? "Result ready to download"
                : "When processing finishes, the result will appear here."
            }
            imageUrl={resultPreview}
            emptyLabel="The background-removed result will appear here."
            checkerboard
            action={
              resultPreview ? (
                <a
                  href={resultPreview}
                  download={downloadName}
                  className="inline-flex items-center justify-center rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                >
                  Download result
                </a>
              ) : null
            }
          />
        </section>

        <section className="grid gap-6 rounded-[2rem] border border-white/10 bg-white/5 p-8 md:grid-cols-3">
          {[
            ["1", "Upload your image", "Choose a JPG, PNG, or WebP image up to 10MB."],
            ["2", "Preview instantly", "The hosted MVP validates the upload in the browser and prepares an instant preview flow."],
            ["3", "Download the result", "Review the preview and save the exported file in one click."],
          ].map(([step, title, description]) => (
            <div key={step} className="rounded-[1.5rem] border border-white/10 bg-slate-950/50 p-6">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">
                Step {step}
              </p>
              <h3 className="text-xl font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
            </div>
          ))}
        </section>

        <section id="faq" className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">
              FAQ
            </p>
            <h2 className="text-3xl font-semibold text-white">
              Common questions about this MVP
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {faqs.map((item) => (
              <div
                key={item.q}
                className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6"
              >
                <h3 className="text-lg font-semibold text-white">{item.q}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-white/10 py-8 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>Built for MVP validation: upload, process, preview, download.</p>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-white">
              Privacy
            </a>
            <a href="/terms" className="hover:text-white">
              Terms
            </a>
          </div>
        </footer>
      </section>
    </main>
  );
}

function PreviewCard({
  title,
  subtitle,
  imageUrl,
  emptyLabel,
  checkerboard,
  action,
}: {
  title: string;
  subtitle: string;
  imageUrl: string | null;
  emptyLabel: string;
  checkerboard?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <article className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{subtitle}</p>
        </div>
        {action}
      </div>

      <div
        className="flex min-h-[320px] items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-4"
        style={checkerboard ? checkerboardBackground() : undefined}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[420px] w-auto rounded-2xl object-contain"
          />
        ) : (
          <p className="max-w-sm text-center text-sm leading-6 text-slate-400">
            {emptyLabel}
          </p>
        )}
      </div>
    </article>
  );
}
// Fri Mar 27 12:10:26 PM CST 2026
