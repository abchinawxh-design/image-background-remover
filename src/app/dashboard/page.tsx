import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listJobsByUser, getMonthlyUsage } from "@/lib/jobs";
import { getUserById } from "@/lib/user";
import Image from "next/image";

export const metadata = {
  title: "Dashboard - Image Background Remover",
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const userId = session.user.id;

  const [user, jobs, monthlyCount] = await Promise.all([
    getUserById(userId),
    listJobsByUser(userId),
    getMonthlyUsage(userId),
  ]);

  const yearMonth = new Date().toISOString().slice(0, 7);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Profile header */}
        <div className="flex items-center gap-4 mb-10">
          {session.user.image && (
            <Image
              src={session.user.image}
              alt="Avatar"
              width={64}
              height={64}
              className="rounded-full"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{session.user.name ?? "User"}</h1>
            <p className="text-slate-400 text-sm">{session.user.email}</p>
            {user && (
              <p className="text-slate-500 text-xs mt-1">
                Member since {new Date(user.created_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Usage stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-slate-800 rounded-xl p-5">
            <p className="text-slate-400 text-sm mb-1">This month</p>
            <p className="text-3xl font-bold text-violet-400">{monthlyCount}</p>
            <p className="text-slate-500 text-xs mt-1">images processed</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-5">
            <p className="text-slate-400 text-sm mb-1">All time</p>
            <p className="text-3xl font-bold text-violet-400">{jobs.length}</p>
            <p className="text-slate-500 text-xs mt-1">total jobs</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-5">
            <p className="text-slate-400 text-sm mb-1">Period</p>
            <p className="text-xl font-bold text-slate-300">{yearMonth}</p>
            <p className="text-slate-500 text-xs mt-1">current month</p>
          </div>
        </div>

        {/* Job history */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent History</h2>
          {jobs.length === 0 ? (
            <div className="bg-slate-800 rounded-xl p-8 text-center text-slate-500">
              No jobs yet. <a href="/" className="text-violet-400 hover:underline">Remove a background</a> to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-slate-800 rounded-xl px-5 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        job.status === "success"
                          ? "bg-green-400"
                          : "bg-red-400"
                      }`}
                    />
                    <span className="text-sm truncate text-slate-200">
                      {job.filename}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    <span className="text-xs text-slate-500">{job.provider}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(job.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
