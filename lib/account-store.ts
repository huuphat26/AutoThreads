// ============================================================
// Multi-Account Store — Quản lý nhiều tài khoản đăng bài
// Tất cả tài khoản đọc từ .env:
//   - Mặc định: THREADS_ACCESS_TOKEN, FB_PAGE_ACCESS_TOKEN, ...
//   - Thêm: ACC2_NAME, ACC2_THREADS_ACCESS_TOKEN, ACC3_NAME, ...
// File data/accounts.json chỉ lưu metadata (name, niche, color overrides).
// ============================================================

import fs from "fs";
import path from "path";
import type {
  PostingAccount,
  AccountStore,
  AccountSafe,
  PlatformCredentials,
} from "@/types";

const STORE_FILE = path.join(process.cwd(), "data", "accounts.json");

const COLOR_PRESETS = [
  "#10b981",
  "#6366f1",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#3b82f6",
  "#84cc16",
];

const isVercel = process.env.VERCEL === "1";

async function syncToKV(store: AccountStore): Promise<void> {
  if (!isVercel) return;
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set("accounts", store);
  } catch (e) {
    console.error("[KV] Failed to sync accounts:", e);
  }
}

function kvSyncFireAndForget(store: AccountStore): void {
  if (!isVercel) return;
  syncToKV(store).catch((e) => console.error("[KV] Sync error:", e));
}

// ─── Helpers ──────────────────────────────────────────────────

function readStore(): AccountStore {
  try {
    if (!fs.existsSync(STORE_FILE)) {
      return { accounts: [], lastUpdated: new Date().toISOString() };
    }
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    return JSON.parse(raw) as AccountStore;
  } catch {
    return { accounts: [], lastUpdated: new Date().toISOString() };
  }
}

function writeStore(store: AccountStore): void {
  store.lastUpdated = new Date().toISOString();
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
  kvSyncFireAndForget(store);
}

export async function initAccountStoreFromKV(): Promise<void> {
  if (!isVercel) return;
  try {
    const { kv } = await import("@vercel/kv");
    const store = await kv.get<AccountStore>("accounts");
    if (store) {
      fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
      fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
      console.log("[KV] Loaded accounts from KV");
    }
  } catch (e) {
    console.error("[KV] Failed to load accounts:", e);
  }
}

/** Sinh ID duy nhất cho account */
export function generateAccountId(): string {
  return `acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Env Account Discovery ───────────────────────────────────

const ENV_ACCOUNT_ID = "env-default";

/** Build default env account */
function buildDefaultEnvAccount(): PostingAccount {
  const acc: PostingAccount = {
    id: ENV_ACCOUNT_ID,
    name: "Tài khoản mặc định",
    niche: "Eat Clean / Healthy Food",
    color: "#10b981",
    isDefault: true,
    isEnvAccount: true,
    createdAt: new Date().toISOString(),
    note: "Đọc credentials từ .env",
  };

  if (process.env.THREADS_ACCESS_TOKEN && process.env.THREADS_USER_ID) {
    acc.threads = { accessToken: "__env__", userId: "__env__" };
  }
  if (process.env.FB_PAGE_ACCESS_TOKEN && process.env.FB_PAGE_ID) {
    acc.facebook = { accessToken: "__env__", userId: "__env__" };
  }
  if (process.env.IG_ACCESS_TOKEN && process.env.IG_USER_ID) {
    acc.instagram = { accessToken: "__env__", userId: "__env__" };
  }

  return acc;
}

/**
 * Scan env for additional accounts: ACC2_NAME, ACC3_NAME, ...
 * Convention:
 *   ACC{N}_NAME            — Tên tài khoản (bắt buộc)
 *   ACC{N}_NICHE           — Niche / chủ đề
 *   ACC{N}_COLOR           — Màu hex
 *   ACC{N}_THREADS_ACCESS_TOKEN / ACC{N}_THREADS_USER_ID
 *   ACC{N}_FB_PAGE_ACCESS_TOKEN / ACC{N}_FB_PAGE_ID
 *   ACC{N}_IG_ACCESS_TOKEN / ACC{N}_IG_USER_ID
 */
function scanAdditionalEnvAccounts(): PostingAccount[] {
  const results: PostingAccount[] = [];
  const seen = new Set<string>();

  for (const key of Object.keys(process.env)) {
    const m = key.match(/^ACC(\d+)_NAME$/);
    if (!m) continue;
    const n = m[1];
    if (seen.has(n)) continue;
    seen.add(n);

    const prefix = `ACC${n}_`;
    const name = process.env[`${prefix}NAME`]?.trim();
    if (!name) continue;

    const acc: PostingAccount = {
      id: `env-acc${n}`,
      name,
      niche: process.env[`${prefix}NICHE`]?.trim() || "",
      color:
        process.env[`${prefix}COLOR`]?.trim() ||
        COLOR_PRESETS[parseInt(n) % COLOR_PRESETS.length],
      isDefault: false,
      isEnvAccount: true,
      createdAt: new Date().toISOString(),
      note: `Credentials từ .env (prefix ACC${n}_)`,
    };

    if (
      process.env[`${prefix}THREADS_ACCESS_TOKEN`] &&
      process.env[`${prefix}THREADS_USER_ID`]
    ) {
      acc.threads = { accessToken: "__env__", userId: "__env__" };
    }
    if (
      process.env[`${prefix}FB_PAGE_ACCESS_TOKEN`] &&
      process.env[`${prefix}FB_PAGE_ID`]
    ) {
      acc.facebook = { accessToken: "__env__", userId: "__env__" };
    }
    if (
      process.env[`${prefix}IG_ACCESS_TOKEN`] &&
      process.env[`${prefix}IG_USER_ID`]
    ) {
      acc.instagram = { accessToken: "__env__", userId: "__env__" };
    }

    results.push(acc);
  }

  return results.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Đồng bộ tất cả env accounts vào store.
 * Ghi đè platform flags, giữ lại metadata override từ store (name, niche, color nếu user đã sửa).
 */
function ensureEnvAccounts(store: AccountStore): AccountStore {
  const allEnv = [buildDefaultEnvAccount(), ...scanAdditionalEnvAccounts()];
  let changed = false;

  for (const envAcc of allEnv) {
    const idx = store.accounts.findIndex((a) => a.id === envAcc.id);
    if (idx >= 0) {
      // Cập nhật platform flags từ env mới nhất
      const existing = store.accounts[idx];
      existing.threads = envAcc.threads;
      existing.facebook = envAcc.facebook;
      existing.instagram = envAcc.instagram;
      existing.isEnvAccount = true;
    } else {
      // Account mới từ env → thêm vào store
      store.accounts.push(envAcc);
      changed = true;
    }
  }

  // Xoá env accounts không còn trong env (trừ default)
  const envIds = new Set(allEnv.map((a) => a.id));
  const before = store.accounts.length;
  store.accounts = store.accounts.filter(
    (a) => !a.isEnvAccount || envIds.has(a.id),
  );
  if (store.accounts.length !== before) changed = true;

  if (changed) writeStore(store);
  return store;
}

// ─── Safe projection ─────────────────────────────────────────

/** Chuyển PostingAccount → AccountSafe (không lộ tokens) */
export function toSafe(account: PostingAccount): AccountSafe {
  return {
    id: account.id,
    name: account.name,
    niche: account.niche,
    color: account.color,
    isDefault: account.isDefault,
    isEnvAccount: account.isEnvAccount,
    hasThreads: !!account.threads?.accessToken,
    hasInstagram: !!account.instagram?.accessToken,
    hasFacebook: !!account.facebook?.accessToken,
    createdAt: account.createdAt,
    note: account.note,
    contentSources: account.contentSources,
  };
}

// ─── Public API ───────────────────────────────────────────────

/** Lấy tất cả accounts (an toàn cho client) */
export function getAllAccountsSafe(): AccountSafe[] {
  const store = ensureEnvAccounts(readStore());
  return store.accounts.map(toSafe);
}

/** Lấy full account (server-side) */
export function getAccount(id: string): PostingAccount | undefined {
  const store = ensureEnvAccounts(readStore());
  return store.accounts.find((a) => a.id === id);
}

/** Lấy account mặc định */
export function getDefaultAccount(): PostingAccount | undefined {
  const store = ensureEnvAccounts(readStore());
  return store.accounts.find((a) => a.isDefault);
}

/** Lấy credentials cho một platform từ account.
 *  Nếu là env account → trả về giá trị từ process.env */
export function getCredentials(
  accountId: string | undefined,
  platform: "threads" | "facebook" | "instagram",
): PlatformCredentials | null {
  const store = ensureEnvAccounts(readStore());
  const account =
    store.accounts.find((a) => a.id === accountId) ??
    store.accounts.find((a) => a.isDefault);

  if (!account) return null;

  if (account.isEnvAccount) {
    return getEnvCredentials(account.id, platform);
  }

  return account[platform] ?? null;
}

/**
 * Đọc credentials từ process.env.
 * env-default → không prefix, env-acc{N} → prefix ACC{N}_
 */
function getEnvCredentials(
  accountId: string,
  platform: "threads" | "facebook" | "instagram",
): PlatformCredentials | null {
  // env-default → "", env-acc2 → "ACC2_", env-acc10 → "ACC10_"
  const prefix =
    accountId === ENV_ACCOUNT_ID
      ? ""
      : `ACC${accountId.replace("env-acc", "")}_`;

  switch (platform) {
    case "threads": {
      const token = process.env[`${prefix}THREADS_ACCESS_TOKEN`];
      const userId = process.env[`${prefix}THREADS_USER_ID`];
      if (!token || !userId) return null;
      return {
        accessToken: token,
        userId,
        appId:
          process.env[`${prefix}THREADS_APP_ID`] || process.env.THREADS_APP_ID,
        appSecret:
          process.env[`${prefix}THREADS_APP_SECRET`] ||
          process.env.THREADS_APP_SECRET,
      };
    }
    case "facebook": {
      const token = process.env[`${prefix}FB_PAGE_ACCESS_TOKEN`];
      const pageId = process.env[`${prefix}FB_PAGE_ID`];
      if (!token || !pageId) return null;
      return {
        accessToken: token,
        userId: pageId,
        appId: process.env[`${prefix}FB_APP_ID`] || process.env.FB_APP_ID,
        appSecret:
          process.env[`${prefix}FB_APP_SECRET`] || process.env.FB_APP_SECRET,
      };
    }
    case "instagram": {
      const token = process.env[`${prefix}IG_ACCESS_TOKEN`];
      const userId = process.env[`${prefix}IG_USER_ID`];
      if (!token || !userId) return null;
      return {
        accessToken: token,
        userId,
        appId:
          process.env[`${prefix}IG_APP_ID`] ||
          process.env.IG_APP_ID ||
          process.env.FB_APP_ID,
        appSecret:
          process.env[`${prefix}IG_APP_SECRET`] ||
          process.env.IG_APP_SECRET ||
          process.env.FB_APP_SECRET,
      };
    }
  }
}

/** Cập nhật metadata của account (name, niche, color, note, isDefault, contentSources) */
export function updateAccount(
  id: string,
  data: Partial<
    Pick<
      PostingAccount,
      "name" | "niche" | "color" | "note" | "isDefault" | "contentSources"
    >
  >,
): PostingAccount | null {
  const store = ensureEnvAccounts(readStore());
  const idx = store.accounts.findIndex((a) => a.id === id);
  if (idx < 0) return null;

  const account = store.accounts[idx];

  // Env account: chỉ cho sửa name, niche, color, note, isDefault, contentSources
  if (data.name !== undefined) account.name = data.name;
  if (data.niche !== undefined) account.niche = data.niche;
  if (data.color !== undefined) account.color = data.color;
  if (data.note !== undefined) account.note = data.note;
  if (data.contentSources !== undefined)
    account.contentSources = data.contentSources;

  // Nếu set isDefault → bỏ default của account khác
  if (data.isDefault) {
    store.accounts.forEach((a, i) => {
      if (i !== idx) a.isDefault = false;
    });
  }

  store.accounts[idx] = account;
  writeStore(store);
  return account;
}

/** Xoá account — env accounts không thể xoá */
export function deleteAccount(id: string): boolean {
  const store = ensureEnvAccounts(readStore());
  const account = store.accounts.find((a) => a.id === id);
  if (!account || account.isEnvAccount) return false;

  store.accounts = store.accounts.filter((a) => a.id !== id);

  // Nếu xoá account default → set env account làm default
  if (account.isDefault) {
    const env = store.accounts.find((a) => a.isEnvAccount);
    if (env) env.isDefault = true;
  }

  writeStore(store);
  return true;
}
