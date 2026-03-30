import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listJobsByUser, getMonthlyUsage } from "@/lib/jobs";
import { getUserById } from "@/lib/user";
import { checkQuota } from "@/lib/plans";
import type { UserPlanData } from "@/lib/plans";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const yearMonth = new Date().toISOString().slice(0, 7);
    const [user, jobs, monthlyCount] = await Promise.all([
      getUserById(userId),
      listJobsByUser(userId),
      getMonthlyUsage(userId),
    ]);

    // Compute quota status
    let quota = null;
    if (user) {
      const planData: UserPlanData = {
        id: user.id,
        plan: user.plan,
        plan_expires_at: user.plan_expires_at,
        credits_total: user.credits_total,
        credits_used: user.credits_used,
      };
      quota = checkQuota(planData, monthlyCount);
    }

    return NextResponse.json({
      user,
      jobs,
      monthlyCount,
      yearMonth,
      quota,
    });
  } catch (e) {
    console.error("[dashboard/data] DB error:", e);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
