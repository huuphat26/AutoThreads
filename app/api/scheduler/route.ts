import { NextRequest, NextResponse } from "next/server";
import { getAutoSchedulerStatus } from "@/lib/services/auto-scheduler";

export async function GET() {
  try {
    const status = getAutoSchedulerStatus();
    // Map to old SchedulerStatus type if needed, but they are very similar
    return NextResponse.json({ success: true, data: status });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    );
  }
}
