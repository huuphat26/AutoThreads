"use client";

// ============================================================
// Account Manager — Dashboard quản lý nhiều tài khoản
// Mỗi account: niche riêng, content pool riêng, cấu hình đăng chéo
// ============================================================

import { useState } from "react";
import { useAccounts } from "@/hooks/use-accounts";
import {
    CheckCircleIcon,
    FacebookIcon,
    InstagramIcon,
    ThreadsIcon,
} from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import type { AccountSafe } from "@/types";

// ── Color presets ──────────────────────────────────────────────
const COLOR_PRESETS = [
    "#10b981", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#14b8a6", "#f97316", "#3b82f6", "#84cc16",
];

// ── Account Dashboard Card ─────────────────────────────────────
function AccountDashboardCard({
    account,
    allAccounts,
    onSetDefault,
    onEdit,
    onToggleCrossPost,
}: {
    account: AccountSafe;
    allAccounts: AccountSafe[];
    onSetDefault: () => void;
    onEdit: () => void;
    onToggleCrossPost: (sourceId: string) => void;
}) {
    const platforms = [
        { key: "threads", has: account.hasThreads, icon: ThreadsIcon, label: "Threads" },
        { key: "facebook", has: account.hasFacebook, icon: FacebookIcon, label: "Facebook" },
        { key: "instagram", has: account.hasInstagram, icon: InstagramIcon, label: "Instagram" },
    ];

    const otherAccounts = allAccounts.filter((a) => a.id !== account.id);
    const sources = account.contentSources ?? [];
    const pendingCount = account.pendingCount ?? 0;

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {/* Color bar */}
            <div className="h-1.5" style={{ backgroundColor: account.color }} />

            <div className="p-4 space-y-4">
                {/* Header */}
                <div className="flex items-start gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ backgroundColor: account.color }}
                    >
                        {account.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-slate-800">{account.name}</p>
                            {account.isDefault && (
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 text-[9px] font-bold">
                                    Auto-post
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            <span className="font-semibold">Niche:</span> {account.niche || "Chưa cấu hình"}
                        </p>
                    </div>
                    <button
                        onClick={onEdit}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors shrink-0"
                    >
                        Chỉnh sửa
                    </button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-slate-400 font-medium">Nền tảng</p>
                        <div className="flex gap-1.5 mt-1">
                            {platforms.map(({ key, has, icon: Icon }) => (
                                <div
                                    key={key}
                                    className={`p-1 rounded-md ${has ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-400"}`}
                                >
                                    <Icon className="w-3 h-3" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-slate-400 font-medium">Nội dung chờ đăng</p>
                        <p className={`text-lg font-bold ${pendingCount > 0 ? "text-indigo-600" : "text-slate-300"}`}>
                            {pendingCount}
                            <span className="text-[10px] font-normal text-slate-400 ml-1">bài</span>
                        </p>
                    </div>
                </div>

                {/* Cross-post configuration */}
                {otherAccounts.length > 0 && (
                    <div className="border border-amber-200 bg-amber-50/50 rounded-xl px-3 py-3 space-y-2">
                        <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                            </svg>
                            <p className="text-[10px] font-bold text-amber-700">
                                Đăng chéo — Mượn nội dung từ tài khoản khác
                            </p>
                        </div>
                        <p className="text-[10px] text-amber-600 leading-relaxed">
                            Khi hết nội dung riêng, tài khoản này sẽ tự lấy bài từ các nguồn đã bật bên dưới để đăng.
                        </p>
                        <div className="space-y-1.5">
                            {otherAccounts.map((other) => {
                                const isSource = sources.includes(other.id);
                                return (
                                    <label
                                        key={other.id}
                                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-[11px] ${isSource
                                            ? "bg-amber-100 border border-amber-300"
                                            : "bg-white border border-slate-200 hover:border-amber-200"
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSource}
                                            onChange={() => onToggleCrossPost(other.id)}
                                            className="w-3.5 h-3.5 rounded accent-amber-500"
                                        />
                                        <div
                                            className="w-4 h-4 rounded flex items-center justify-center text-white text-[8px] font-bold"
                                            style={{ backgroundColor: other.color }}
                                        >
                                            {other.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-semibold text-slate-700">{other.name}</span>
                                        <span className="text-slate-400">— {other.niche}</span>
                                        {isSource && (
                                            <CheckCircleIcon className="w-3 h-3 text-amber-500 ml-auto" />
                                        )}
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Bottom actions */}
                <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
                    {!account.isDefault && (
                        <button
                            onClick={onSetDefault}
                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 transition-colors"
                        >
                            Đặt làm mặc định
                        </button>
                    )}
                    {account.note && (
                        <p className="text-[10px] text-slate-400 italic ml-auto truncate max-w-[200px]">
                            {account.note}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Edit Metadata Form ──────────────────────────────────────────
function AccountEditForm({
    initial,
    onSave,
    onCancel,
}: {
    initial: AccountSafe;
    onSave: (data: Record<string, unknown>) => Promise<void>;
    onCancel: () => void;
}) {
    const [name, setName] = useState(initial.name);
    const [niche, setNiche] = useState(initial.niche);
    const [color, setColor] = useState(initial.color);
    const [note, setNote] = useState(initial.note ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError("Tên tài khoản không được trống");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await onSave({ name: name.trim(), niche: niche.trim(), color, note: note.trim() || undefined });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Lỗi lưu");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white border border-indigo-200 rounded-xl p-4 space-y-4">
            <p className="text-sm font-bold text-slate-800">Chỉnh sửa — {initial.name}</p>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                        Tên tài khoản
                    </label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Vd: Food Blog"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                        Niche / Chủ đề
                    </label>
                    <input
                        value={niche}
                        onChange={(e) => setNiche(e.target.value)}
                        placeholder="Vd: Món ăn, Nhà trọ, Công nghệ..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                </div>
            </div>

            {/* Color */}
            <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">Màu sắc</label>
                <div className="flex gap-1.5 flex-wrap">
                    {COLOR_PRESETS.map((c) => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? "border-slate-800 scale-110" : "border-transparent"
                                }`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>

            {/* Note */}
            <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-1">Ghi chú</label>
                <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Tuỳ chọn..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
            </div>

            {error && <p className="text-[10px] text-red-500">{error}</p>}

            <div className="flex gap-2 pt-1">
                <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                    {saving && <Spinner />}
                    Lưu thay đổi
                </button>
                <button
                    onClick={onCancel}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                    Huỷ
                </button>
            </div>
        </div>
    );
}

// ── Main Panel ────────────────────────────────────────────────
export function AccountManagerPanel() {
    const { accounts, loading, updateAccount } = useAccounts();
    const [editingId, setEditingId] = useState<string | null>(null);

    const editingAccount = editingId
        ? accounts.find((a) => a.id === editingId) ?? null
        : null;

    const handleUpdate = async (data: Record<string, unknown>) => {
        if (!editingId) return;
        await updateAccount(editingId, data);
        setEditingId(null);
    };

    const handleSetDefault = async (id: string) => {
        await updateAccount(id, { isDefault: true });
    };

    const handleToggleCrossPost = async (accountId: string, sourceId: string) => {
        const acc = accounts.find((a) => a.id === accountId);
        if (!acc) return;
        const current = acc.contentSources ?? [];
        const next = current.includes(sourceId)
            ? current.filter((s) => s !== sourceId)
            : [...current, sourceId];
        await updateAccount(accountId, { contentSources: next });
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Overview */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl px-4 py-4 space-y-3">
                <p className="text-xs font-bold text-indigo-800">Cách hoạt động</p>
                <div className="grid gap-2 text-[11px] text-indigo-700 leading-relaxed">
                    <div className="flex items-start gap-2">
                        <span className="font-bold text-indigo-500 mt-0.5 shrink-0">1.</span>
                        <p>Mỗi tài khoản có <strong>niche riêng</strong> (món ăn, nhà trọ, công nghệ...) và <strong>sheet data riêng</strong>.</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="font-bold text-indigo-500 mt-0.5 shrink-0">2.</span>
                        <p>Import file Excel ở tab <strong>Content Pool</strong> — chọn tài khoản trước khi import.</p>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="font-bold text-indigo-500 mt-0.5 shrink-0">3.</span>
                        <p>Bật <strong>Đăng chéo</strong> để tài khoản A có thể mượn nội dung của tài khoản B và ngược lại.</p>
                    </div>
                </div>
            </div>

            {/* Account cards */}
            <div className="space-y-4">
                {accounts.map((acc) => (
                    <AccountDashboardCard
                        key={acc.id}
                        account={acc}
                        allAccounts={accounts}
                        onSetDefault={() => handleSetDefault(acc.id)}
                        onEdit={() => setEditingId(acc.id)}
                        onToggleCrossPost={(sourceId) => handleToggleCrossPost(acc.id, sourceId)}
                    />
                ))}
            </div>

            {/* Edit form */}
            {editingId && editingAccount && (
                <AccountEditForm
                    initial={editingAccount}
                    onSave={handleUpdate}
                    onCancel={() => setEditingId(null)}
                />
            )}

            {accounts.length === 0 && (
                <div className="text-center py-8 text-sm text-slate-400">
                    Không tìm thấy tài khoản nào trong .env
                </div>
            )}

            {/* Env hint — collapsed */}
            {accounts.length > 0 && (
                <details className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] text-slate-500">
                    <summary className="font-semibold text-slate-700 cursor-pointer select-none">
                        Thêm tài khoản mới (cập nhật .env)
                    </summary>
                    <div className="mt-2 space-y-1">
                        <p>
                            Thêm prefix{" "}
                            <code className="bg-slate-200 px-1 rounded text-[10px]">ACC2_</code>,{" "}
                            <code className="bg-slate-200 px-1 rounded text-[10px]">ACC3_</code>, ... vào file .env rồi restart server:
                        </p>
                        <pre className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-[10px] text-slate-600 overflow-x-auto">
                            {`ACC2_NAME=Nhà Trọ HCM
ACC2_NICHE=Tìm nhà trọ / Phòng cho thuê
ACC2_THREADS_ACCESS_TOKEN=...
ACC2_THREADS_USER_ID=...
ACC2_FB_PAGE_ACCESS_TOKEN=...
ACC2_FB_PAGE_ID=...`}
                        </pre>
                    </div>
                </details>
            )}
        </div>
    );
}
