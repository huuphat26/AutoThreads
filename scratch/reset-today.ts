import fs from "fs";
import path from "path";
import type { AutoPostHistory, ContentPoolStore, AutoPostRecord, ContentPoolItem } from "@/types";

const HISTORY_FILE = path.join(process.cwd(), "data", "auto-post-history.json");
const POOL_FILE = path.join(process.cwd(), "data", "content-pool.json");

function resetToday() {
  const todayDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  console.log(`[Reset] Target date: ${todayDate}`);

  // 1. Clear History
  if (fs.existsSync(HISTORY_FILE)) {
    const history = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8")) as AutoPostHistory;
    const originalCount = history.records.length;
    history.records = history.records.filter((r: AutoPostRecord) => {
      const rDate = new Date(r.triggeredAt).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
      return rDate !== todayDate;
    });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    console.log(`[History] Deleted ${originalCount - history.records.length} records for today.`);
  }

  // 2. Reset Pool Status
  if (fs.existsSync(POOL_FILE)) {
    const pool = JSON.parse(fs.readFileSync(POOL_FILE, "utf-8")) as ContentPoolStore;
    let resetCount = 0;
    pool.items.forEach((item: ContentPoolItem) => {
      if (item.date === todayDate && item.status === "used") {
        item.status = "pending";
        delete item.usedAt;
        delete item.recordId;
        resetCount++;
      }
    });
    fs.writeFileSync(POOL_FILE, JSON.stringify(pool, null, 2));
    console.log(`[Pool] Reset ${resetCount} items back to 'pending' for today.`);
  }

  console.log("[Done] Today's queue has been reset.");
}

resetToday();
