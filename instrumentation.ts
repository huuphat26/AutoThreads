// ============================================
// AUTO THREADS - Instrumentation
// Khởi động Scheduler khi Next.js server start
// ============================================
export async function register() {
  // Chỉ chạy trên server-side (không chạy trong Edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./lib/scheduler");
    const { startFBScheduler } = await import("./lib/services/fb-scheduler");
    const { startIGScheduler } = await import("./lib/services/ig-scheduler");
    const { startThreadsManualScheduler } =
      await import("./lib/services/threads-manual-scheduler");
    const { startAutoScheduler } = await import("./lib/services/auto-scheduler");
    startScheduler();
    startFBScheduler();
    startIGScheduler();
    startThreadsManualScheduler();
    startAutoScheduler();
    console.log(
      "[AutoThreads] 🟢 App khởi động - Threads, Facebook, Instagram, Threads Manual & Auto (3-platform) Scheduler đã được kích hoạt",
    );
  }
}
