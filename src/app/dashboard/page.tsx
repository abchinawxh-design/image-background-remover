"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface Job {
  id: string;
  filename: string;
  provider: string;
  status: string;
  created_at: number;
}

interface QuotaStatus {
  allowed: boolean;
  plan: string;
  creditsRemaining?: number;
  monthlyUsed?: number;
  monthlyLimit?: number;
}

interface DashboardData {
  user: {
    created_at: number;
    plan: string;
    plan_expires_at: number | null;
    credits_total: number;
    credits_used: number;
  } | null;
  jobs: Job[];
  monthlyCount: number;
  yearMonth: string;
  quota: QuotaStatus | null;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/api/auth/signin";
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/dashboard/data")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-slate-400">Loading dashboard…</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-red-400">Error: {error}</div>
      </main>
    );
  }

  const user = data?.user;
  const quota = data?.quota;
  const isPro = user?.plan === "pro";
  const planExpiresAt = user?.plan_expires_at ? new Date(user.plan_expires_at).toLocaleDateString() : null;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Back link */}
        <Link href="/" className="text-slate-400 hover:text-white text-sm mb-8 inline-block">
          ← Back to home
        </Link>

        {/* Profile header */}
        <div className="flex items-center gap-4 mb-10">
          {session?.user?.image && (
            <Image
              src={session.user.image}
              alt="Avatar"
              width={64}
              height={64}
              className="rounded-full"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{session?.user?.name ?? "My Account"}</h1>
            <p className="text-slate-400 text-sm">{session?.user?.email}</p>
          </div>
        </div>

        {/* Plan status card */}
        <div className={`rounded-2xl border p-6 mb-8 ${
          isPro ? "border-sky-500/50 bg-sky-950/30" : "border-white/10 bg-white/5"
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className={`inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2 ${
                isPro ? "bg-sky-500 text-white" : "bg-white/10 text-slate-300"
              }`}>
                {isPro ? "Pro" : "Free"}
              </span>
              {isPro && planExpiresAt && (
                <p className="text-xs text-slate-400">Renews / expires: {planExpiresAt}</p>
              )}
            </div>
            {!isPro && (
              <Link
                href="/pricing"
                className="text-sm bg-sky-500 hover:bg-sky-400 transition rounded-lg px-4 py-2 font-semibold"
              >
                Upgrade to Pro →
              </Link>
            )}
          </div>

          {/* Usage bar */}
          {isPro ? (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">This month</span>
                <span className="text-slate-400">{quota?.monthlyUsed ?? 0} / {quota?.monthlyLimit ?? 100} removals</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-sky-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((quota?.monthlyUsed ?? 0) / (quota?.monthlyLimit ?? 100)) * 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">Free credits</span>
                <span className="text-slate-400">{quota?.creditsRemaining ?? 0} / {user?.credits_total ?? 3} remaining</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((quota?.creditsRemaining ?? 0) / (user?.credits_total ?? 3)) * 100)}%` }}
                />
              </div>
              {(quota?.creditsRemaining ?? 0) === 0 && (
                <p className="text-xs text-amber-400 mt-2">You&apos;ve used all free credits. <Link href="/pricing" className="underline">Upgrade to Pro</Link> for 100/month.</p>
              )}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-2xl font-bold">{data?.jobs.length ?? 0}</p>
            <p className="text-slate-400 text-xs mt-1">Total removals</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-2xl font-bold">{data?.monthlyCount ?? 0}</p>
            <p className="text-slate-400 text-xs mt-1">This month</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-2xl font-bold">{data?.jobs.filter(j => j.status === "success").length ?? 0}</p>
            <p className="text-slate-400 text-xs mt-1">Successful</p>
          </div>
        </div>

        {/* Job history */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent removals</h2>
          {data?.jobs.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
              <p className="text-slate-400 text-sm">No removals yet.</p>
              <Link href="/" className="inline-block mt-3 text-sky-400 hover:text-sky-300 text-sm">Remove a background →</Link>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10 bg-white/5">
                  <tr>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">File</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data?.jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-white/5">
                      <td className="py-3 px-4 text-slate-300 truncate max-w-[200px]">{job.filename}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                          job.status === "success" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(job.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sign out */}
        <div className="mt-10 pt-6 border-t border-white/10">
          <Link
            href="/api/auth/signout"
            className="text-sm text-slate-500 hover:text-slate-300 transition"
          >
            Sign out
          </Link>
        </div>
      </div>
    </main>
  );
}
