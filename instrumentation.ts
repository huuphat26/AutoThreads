// ============================================
// AUTO THREADS - Instrumentation
// Khởi động Scheduler khi Next.js server start
// ============================================
export async function register() {
  // Chỉ chạy trên server-side (không chạy trong Edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { startScheduler } = await import("./lib/scheduler");
      startScheduler();
    } catch (err) {
      console.error(
        "[AutoThreads] ❌ Không thể khởi động Threads scheduler:",
        err,
      );
    }

    try {
      const { startFBScheduler } = await import("./lib/services/fb-scheduler");
      startFBScheduler();
    } catch (err) {
      console.error("[AutoThreads] ❌ Không thể khởi động FB scheduler:", err);
    }

    try {
      const { startIGScheduler } = await import("./lib/services/ig-scheduler");
      startIGScheduler();
    } catch (err) {
      console.error("[AutoThreads] ❌ Không thể khởi động IG scheduler:", err);
    }

    try {
      const { startThreadsManualScheduler } =
        await import("./lib/services/threads-manual-scheduler");
      startThreadsManualScheduler();
    } catch (err) {
      console.error(
        "[AutoThreads] ❌ Không thể khởi động Threads manual scheduler:",
        err,
      );
    }

    try {
      const { startAutoScheduler } =
        await import("./lib/services/auto-scheduler");
      startAutoScheduler();
    } catch (err) {
      console.error(
        "[AutoThreads] ❌ Không thể khởi động auto scheduler:",
        err,
      );
    }

    console.log(
      "[AutoThreads] 🟢 App khởi động - Threads, Facebook, Instagram, Threads Manual & Auto (3-platform) Scheduler đã được kích hoạt",
    );
  }
}
