"use client";

// ============================================================
// AccountSelector — Dropdown chọn tài khoản đăng bài
// Khi chọn tài khoản khác (không phải mặc định), hiện popup xác nhận
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import type { AccountSafe } from "@/types";
import { UsersIcon } from "@/components/ui/icons";

interface Props {
  value?: string;
  onChange: (accountId: string) => void;
  /** Nếu true, hiện dạng compact (nhỏ gọn) */
  compact?: boolean;
  className?: string;
}

// ── Confirmation Dialog ────────────────────────────────────────
function AccountSwitchDialog({
  account,
  onConfirm,
  onCancel,
}: {
  account: AccountSafe;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm"
              style={{ backgroundColor: account.color }}
            >
              {account.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{account.name}</p>
              <p className="text-[11px] text-slate-400">{account.niche}</p>
            </div>
          </div>

          <p className="text-sm text-slate-700 font-semibold mb-1">
            Chuyển sang tài khoản này?
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Bạn sẽ dùng tài khoản <strong>{account.name}</strong> đăng nội dung
            nào, sheet data nào? Hãy đảm bảo bạn đã import nội dung phù hợp cho
            tài khoản này trong tab <strong>Content Pool</strong>.
          </p>
        </div>

        {/* Info */}
        <div className="mx-5 mb-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <p className="text-[10px] text-amber-700 leading-relaxed">
            💡 Nội dung trong Content Pool được phân theo tài khoản. Import file
            xlsx riêng cho mỗi tài khoản để quản lý nội dung độc lập.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Huỷ
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-colors"
            style={{ backgroundColor: account.color }}
          >
            Xác nhận dùng tài khoản này
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Selector ──────────────────────────────────────────────
export function AccountSelector({
  value,
  onChange,
  compact = false,
  className = "",
}: Props) {
  const [accounts, setAccounts] = useState<AccountSafe[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pendingAccount, setPendingAccount] = useState<AccountSafe | null>(
    null,
  );
  const prevValueRef = useRef<string | undefined>(value);

  useEffect(() => {
    fetch("/api/accounts", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setAccounts(json.data);
          // Auto-select default account if no value
          if (!value) {
            const def = (json.data as AccountSafe[]).find((a) => a.isDefault);
            if (def) onChange(def.id);
          }
        }
      })
      .finally(() => setLoaded(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback(
    (newId: string) => {
      const acc = accounts.find((a) => a.id === newId);
      if (!acc) return;

      // If selecting a non-default account, show confirmation popup
      if (!acc.isDefault) {
        prevValueRef.current = value;
        setPendingAccount(acc);
      } else {
        onChange(newId);
      }
    },
    [accounts, value, onChange],
  );

  const handleConfirm = useCallback(() => {
    if (pendingAccount) {
      onChange(pendingAccount.id);
      setPendingAccount(null);
    }
  }, [pendingAccount, onChange]);

  const handleCancel = useCallback(() => {
    setPendingAccount(null);
    // Value stays unchanged (still the previous selection)
  }, []);

  if (!loaded || accounts.length <= 1) return null;

  const selected = accounts.find((a) => a.id === value);

  return (
    <>
      {compact ? (
        <div className={`flex items-center gap-1.5 ${className}`}>
          {selected && (
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: selected.color }}
            />
          )}
          <select
            value={value || ""}
            onChange={(e) => handleChange(e.target.value)}
            className="text-[10px] font-semibold text-slate-600 bg-transparent border-none outline-none cursor-pointer hover:text-slate-800 transition-colors p-0"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.niche})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div
          className={`flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 ${className}`}
        >
          <UsersIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              Đăng từ tài khoản
            </label>
            <select
              value={value || ""}
              onChange={(e) => handleChange(e.target.value)}
              className="w-full text-xs font-semibold text-slate-700 bg-transparent border-none outline-none cursor-pointer"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} — {acc.niche}
                  {acc.isDefault ? " (Mặc định)" : ""}
                </option>
              ))}
            </select>
          </div>
          {selected && (
            <div
              className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm"
              style={{ backgroundColor: selected.color }}
            />
          )}
        </div>
      )}

      {/* Confirmation dialog for non-default account */}
      {pendingAccount && (
        <AccountSwitchDialog
          account={pendingAccount}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
