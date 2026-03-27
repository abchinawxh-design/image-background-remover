import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listJobsByUser, getMonthlyUsage } from "@/lib/jobs";
import { getUserById } from "@/lib/user";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const [user, jobs, monthlyCount] = await Promise.all([
      getUserById(userId),
      listJobsByUser(userId),
      getMonthlyUsage(userId),
    ]);

    return NextResponse.json({
      user,
      jobs,
      monthlyCount,
      yearMonth: new Date().toISOString().slice(0, 7),
    });
  } catch (e) {
    console.error("[dashboard/data] DB error:", e);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
