// ─── Slot hours & platform config ────────────────────────────

export const SLOT_HOURS: Record<string, { h: number; m: number }> = {
  morning: { h: 6, m: 30 },
  noon: { h: 11, m: 30 },
  evening: { h: 17, m: 0 },
};

/** Khoảng cách giữa các nền tảng khi đăng (phút) */
export const DELAY_MINUTES = 3;

/** Thời gian chuẩn bị content trước giờ đăng (phút) */
export const PREP_BEFORE_POST_MIN = 15;

export const PLATFORMS = [
  { key: "facebook", label: "Facebook", delayMin: 0 },
  { key: "threads", label: "Threads", delayMin: DELAY_MINUTES },
  { key: "instagram", label: "Instagram", delayMin: DELAY_MINUTES * 2 },
] as const;

// ─── Utility functions ────────────────────────────────────────

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function slotDateToday(slotId: string, extraMinutes = 0): Date {
  const { h, m } = SLOT_HOURS[slotId] ?? { h: 13, m: 0 };
  const now = new Date();
  const vnNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
  );
  vnNow.setHours(h, m + extraMinutes, 0, 0);
  const offset =
    now.getTime() -
    new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
    ).getTime();
  return new Date(vnNow.getTime() + offset);
}

export function slotTimeLabel(slotId: string, extraMinutes: number): string {
  const { h, m } = SLOT_HOURS[slotId] ?? { h: 13, m: 0 };
  const totalMin = m + extraMinutes;
  const hh = String(h + Math.floor(totalMin / 60)).padStart(2, "0");
  const mm = String(totalMin % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function todayLabel(): string {
  return new Date().toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function isTodayVN(iso: string): boolean {
  const todayKey = new Date().toLocaleDateString("sv", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
  return (
    new Date(iso).toLocaleDateString("sv", {
      timeZone: "Asia/Ho_Chi_Minh",
    }) === todayKey
  );
}
