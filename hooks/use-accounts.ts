"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccountSafe } from "@/types";

export function useAccounts() {
  const [accounts, setAccounts] = useState<AccountSafe[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/accounts");
      const json = await res.json();
      if (json.success) setAccounts(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const updateAccount = async (
    id: string,
    data: Partial<{
      name: string;
      niche: string;
      color: string;
      note: string;
      isDefault: boolean;
      contentSources: string[];
    }>,
  ) => {
    const res = await fetch("/api/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    const json = await res.json();
    if (json.success) {
      await fetchAccounts();
      return json.data as AccountSafe;
    }
    throw new Error(json.error || "Lỗi cập nhật");
  };

  return {
    accounts,
    loading,
    fetchAccounts,
    updateAccount,
  };
}
