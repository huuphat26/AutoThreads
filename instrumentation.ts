// ============================================
// AUTO THREADS - Instrumentation
// Khởi động Scheduler khi Next.js server start
// ============================================
export async function register() {
  // Chỉ chạy trên server-side
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { startAutoScheduler } = await import("./lib/services/auto-scheduler");
      startAutoScheduler();
    } catch (err) {
      console.error("[AutoThreads] ❌ Không thể khởi động auto scheduler:", err);
    }

    console.log(
      "[AutoThreads] 🟢 App khởi động - Chỉ duy nhất Auto (3-platform) Scheduler được kích hoạt"
    );
  }
}
