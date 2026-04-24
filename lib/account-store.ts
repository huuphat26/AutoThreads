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

const ENV_TAG_ACCOUNT_PREFIX = "env-tag-";

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

function readEnvFirst(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

function hasAnyPlatformCredentials(account: PostingAccount): boolean {
  return Boolean(account.threads || account.facebook || account.instagram);
}

function humanizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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

  const thToken = readEnvFirst("THREADS_ACCESS_TOKEN");
  const thUserId = readEnvFirst("THREADS_USER_ID");
  const fbToken = readEnvFirst("FB_PAGE_ACCESS_TOKEN", "FB_ACCESS_TOKEN");
  const fbPageId = readEnvFirst("FB_PAGE_ID", "FB_USER_ID");
  const igToken = readEnvFirst("IG_ACCESS_TOKEN");
  const igUserId = readEnvFirst("IG_USER_ID", "IG_PAGE_ID");

  if (thToken && thUserId) {
    acc.threads = { accessToken: "__env__", userId: "__env__" };
  }
  if (fbToken && fbPageId) {
    acc.facebook = { accessToken: "__env__", userId: "__env__" };
  }
  if (igToken && igUserId) {
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
  const byId = new Map<string, PostingAccount>();

  // Legacy format: ACC{N}_NAME + ACC{N}_<PLATFORM_KEY>
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

    const thToken = readEnvFirst(`${prefix}THREADS_ACCESS_TOKEN`);
    const thUserId = readEnvFirst(`${prefix}THREADS_USER_ID`);
    const fbToken = readEnvFirst(
      `${prefix}FB_PAGE_ACCESS_TOKEN`,
      `${prefix}FB_ACCESS_TOKEN`,
    );
    const fbPageId = readEnvFirst(`${prefix}FB_PAGE_ID`, `${prefix}FB_USER_ID`);
    const igToken = readEnvFirst(`${prefix}IG_ACCESS_TOKEN`);
    const igUserId = readEnvFirst(`${prefix}IG_USER_ID`, `${prefix}IG_PAGE_ID`);

    if (thToken && thUserId) {
      acc.threads = { accessToken: "__env__", userId: "__env__" };
    }
    if (fbToken && fbPageId) {
      acc.facebook = { accessToken: "__env__", userId: "__env__" };
    }
    if (igToken && igUserId) {
      acc.instagram = { accessToken: "__env__", userId: "__env__" };
    }

    if (hasAnyPlatformCredentials(acc)) {
      results.push(acc);
      byId.set(acc.id, acc);
    }
  }

  // New format: <BASE_KEY>_<TAG> (vd: THREADS_ACCESS_TOKEN_EPXANH)
  const suffixes = new Set<string>();
  for (const key of Object.keys(process.env)) {
    const m = key.match(
      /^(THREADS_ACCESS_TOKEN|THREADS_USER_ID|FB_PAGE_ACCESS_TOKEN|FB_ACCESS_TOKEN|FB_PAGE_ID|FB_USER_ID|IG_ACCESS_TOKEN|IG_USER_ID|IG_PAGE_ID)_(.+)$/,
    );
    if (!m) continue;
    const tag = m[2]?.trim();
    if (tag) suffixes.add(tag.toUpperCase());
  }

  const sortedTags = Array.from(suffixes).sort((a, b) => a.localeCompare(b));
  for (let idx = 0; idx < sortedTags.length; idx++) {
    const tag = sortedTags[idx];
    const id = `${ENV_TAG_ACCOUNT_PREFIX}${tag.toLowerCase()}`;
    if (byId.has(id)) continue;

    const thToken = readEnvFirst(`THREADS_ACCESS_TOKEN_${tag}`);
    const thUserId = readEnvFirst(`THREADS_USER_ID_${tag}`);
    const fbToken = readEnvFirst(
      `FB_PAGE_ACCESS_TOKEN_${tag}`,
      `FB_ACCESS_TOKEN_${tag}`,
    );
    const fbPageId = readEnvFirst(`FB_PAGE_ID_${tag}`, `FB_USER_ID_${tag}`);
    const igToken = readEnvFirst(`IG_ACCESS_TOKEN_${tag}`);
    const igUserId = readEnvFirst(`IG_USER_ID_${tag}`, `IG_PAGE_ID_${tag}`);

    const acc: PostingAccount = {
      id,
      name:
        readEnvFirst(`ACCOUNT_${tag}_NAME`, `ACC_${tag}_NAME`, `${tag}_NAME`) ||
        humanizeTag(tag),
      niche:
        readEnvFirst(
          `ACCOUNT_${tag}_NICHE`,
          `ACC_${tag}_NICHE`,
          `${tag}_NICHE`,
        ) || "",
      color:
        readEnvFirst(
          `ACCOUNT_${tag}_COLOR`,
          `ACC_${tag}_COLOR`,
          `${tag}_COLOR`,
        ) || COLOR_PRESETS[idx % COLOR_PRESETS.length],
      isDefault: false,
      isEnvAccount: true,
      createdAt: new Date().toISOString(),
      note: `Credentials từ .env (suffix _${tag})`,
    };

    if (thToken && thUserId) {
      acc.threads = { accessToken: "__env__", userId: "__env__" };
    }
    if (fbToken && fbPageId) {
      acc.facebook = { accessToken: "__env__", userId: "__env__" };
    }
    if (igToken && igUserId) {
      acc.instagram = { accessToken: "__env__", userId: "__env__" };
    }

    if (hasAnyPlatformCredentials(acc)) {
      byId.set(id, acc);
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Đồng bộ tất cả env accounts vào store.
 * Env là source of truth cho env accounts:
 * - Ghi đè metadata (name, niche, color, note) từ env hiện tại.
 * - Ghi đè platform flags theo env mới nhất.
 */
function ensureEnvAccounts(store: AccountStore): AccountStore {
  const allEnv = [buildDefaultEnvAccount(), ...scanAdditionalEnvAccounts()];
  let changed = false;

  for (const envAcc of allEnv) {
    const idx = store.accounts.findIndex((a) => a.id === envAcc.id);
    if (idx >= 0) {
      // Env account đã có trong store -> đồng bộ toàn bộ từ env.
      const existing = store.accounts[idx];
      const prev = JSON.stringify(existing);

      existing.name = envAcc.name;
      existing.niche = envAcc.niche;
      existing.color = envAcc.color;
      existing.note = envAcc.note;
      existing.threads = envAcc.threads;
      existing.facebook = envAcc.facebook;
      existing.instagram = envAcc.instagram;
      existing.isEnvAccount = true;

      if (JSON.stringify(existing) !== prev) {
        changed = true;
      }
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

  // Đảm bảo luôn có default hợp lệ. Nếu default hiện tại không còn credentials,
  // tự chuyển sang account env đầu tiên còn dùng được.
  const currentDefault = store.accounts.find((a) => a.isDefault);
  if (currentDefault && !hasAnyPlatformCredentials(currentDefault)) {
    currentDefault.isDefault = false;
    changed = true;
  }
  if (!store.accounts.some((a) => a.isDefault)) {
    const fallback = store.accounts.find(hasAnyPlatformCredentials);
    if (fallback) {
      fallback.isDefault = true;
      changed = true;
    }
  }

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
  const suffixTag = accountId.startsWith(ENV_TAG_ACCOUNT_PREFIX)
    ? accountId.slice(ENV_TAG_ACCOUNT_PREFIX.length).toUpperCase()
    : undefined;

  const legacyPrefix = accountId.match(/^env-acc(\d+)$/)?.[1];

  const withScope = (base: string): string[] => {
    if (accountId === ENV_ACCOUNT_ID) return [base];
    if (legacyPrefix) return [`ACC${legacyPrefix}_${base}`];
    if (suffixTag) return [`${base}_${suffixTag}`];
    return [base];
  };

  const readScoped = (...bases: string[]): string | undefined =>
    readEnvFirst(...bases.flatMap(withScope));

  switch (platform) {
    case "threads": {
      const token = readScoped("THREADS_ACCESS_TOKEN");
      const userId = readScoped("THREADS_USER_ID");
      if (!token || !userId) return null;
      return {
        accessToken: token,
        userId,
        appId: readScoped("THREADS_APP_ID") || process.env.THREADS_APP_ID,
        appSecret:
          readScoped("THREADS_APP_SECRET") || process.env.THREADS_APP_SECRET,
      };
    }
    case "facebook": {
      const token = readScoped("FB_PAGE_ACCESS_TOKEN", "FB_ACCESS_TOKEN");
      const pageId = readScoped("FB_PAGE_ID", "FB_USER_ID");
      if (!token || !pageId) return null;
      return {
        accessToken: token,
        userId: pageId,
        appId: readScoped("FB_APP_ID") || process.env.FB_APP_ID,
        appSecret: readScoped("FB_APP_SECRET") || process.env.FB_APP_SECRET,
      };
    }
    case "instagram": {
      const token = readScoped("IG_ACCESS_TOKEN");
      const userId = readScoped("IG_USER_ID", "IG_PAGE_ID");
      if (!token || !userId) return null;
      return {
        accessToken: token,
        userId,
        appId:
          readScoped("IG_APP_ID") ||
          process.env.IG_APP_ID ||
          process.env.FB_APP_ID,
        appSecret:
          readScoped("IG_APP_SECRET") ||
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
