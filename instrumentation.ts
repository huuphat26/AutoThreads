// ============================================
// AUTO THREADS - Instrumentation
// Khởi động Scheduler khi Next.js server start
// ============================================
export async function register() {
  // Chỉ chạy trên server-side (không chạy trong Edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
    console.log("[AutoThreads] 🟢 App khởi động - Scheduler đã được kích hoạt");
  }
}
